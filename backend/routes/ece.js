import { Router } from "express";
import multer from "multer";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import db from "../db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const MODEL_TEXTE = "llama-3.3-70b-versatile";
const MODEL_IMAGE = "llama-3.2-11b-vision-preview";

const storage = multer.diskStorage({
  destination: join(__dirname, "../uploads"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith("text/")) cb(null, true);
    else cb(new Error("Type de fichier non supporté"));
  },
});

const SYSTEM_PROMPT = `Tu es un professeur de lycée expert en sciences (Physique-Chimie, SVT, etc.) qui prépare des élèves aux ECE du Baccalauréat français.
Tu produis des corrections COMPLÈTES, DÉTAILLÉES et PÉDAGOGIQUES des sujets d'ECE.
Réponds UNIQUEMENT avec un objet JSON valide, rien avant ni après, sans balises markdown.
N'inclus JAMAIS le texte brut du sujet dans ta réponse. Corrige et explique uniquement.`;

const JSON_SCHEMA = `{
  "titre": "Titre du sujet ECE",
  "matiere": "Physique-Chimie ou SVT ou autre",
  "contexte": "Résumé du contexte et de la problématique du sujet en 3-4 phrases.",
  "correction_questions": [
    {
      "numero": "Question 1",
      "enonce": "Reformulation courte de la question",
      "reponse": "Réponse complète, détaillée et rédigée avec les éléments attendus par le correcteur.",
      "points_cles": ["Point essentiel à mentionner 1", "Point essentiel 2"]
    }
  ],
  "manipulation": {
    "protocole": ["Étape 1 : ...", "Étape 2 : ...", "..."],
    "astuces": ["Astuce pratique 1", "Astuce 2", "..."],
    "erreurs_courantes": ["Erreur fréquente à éviter 1", "Erreur 2", "..."],
    "securite": ["Consigne de sécurité 1 si applicable", "..."]
  },
  "methode_generale": "Conseils méthodologiques pour aborder ce type d'ECE : comment lire le sujet, comment organiser son temps, comment rédiger les réponses.",
  "mots_cles": ["mot-clé 1", "mot-clé 2", "..."]
}`;

function extractJSON(text) {
  const clean = text.trim();
  const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) return JSON.parse(mdMatch[1].trim());
  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) return JSON.parse(objMatch[0]);
  return JSON.parse(clean);
}

async function corrigerECE(contenu, typeSource, fichierPath, mimetype) {
  let response;

  if (typeSource === "image" && fichierPath) {
    const imageData = readFileSync(fichierPath).toString("base64");
    const mediaType = mimetype || "image/jpeg";

    response = await client.chat.completions.create({
      model: MODEL_IMAGE,
      max_tokens: 4000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageData}` } },
            { type: "text", text: `Corrige ce sujet d'ECE et génère une correction complète au format JSON strict :\n${JSON_SCHEMA}` },
          ],
        },
      ],
    });
  } else {
    const contenuTronque = contenu.length > 6000
      ? contenu.slice(0, 6000) + "\n[... sujet tronqué ...]"
      : contenu;

    response = await client.chat.completions.create({
      model: MODEL_TEXTE,
      max_tokens: 4000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Voici le sujet d'ECE à corriger :\n\n<sujet>\n${contenuTronque}\n</sujet>\n\nGénère une correction complète au format JSON strict. Réponds avec SEULEMENT ce JSON :\n${JSON_SCHEMA}`,
        },
      ],
    });
  }

  const raw = response.choices[0].message.content.trim();
  return extractJSON(raw);
}

// POST /api/ece/corriger
router.post("/corriger", upload.single("fichier"), async (req, res) => {
  try {
    let contenu = req.body.texte || "";
    let typeSource = "texte";
    let nomFichier = null;
    let mimetype = null;

    if (req.file) {
      nomFichier = req.file.originalname;
      mimetype = req.file.mimetype;

      if (req.file.mimetype === "application/pdf") {
        typeSource = "pdf";
        const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
        const buffer = readFileSync(req.file.path);
        const data = await pdfParse(buffer);
        contenu = data.text;
      } else if (req.file.mimetype.startsWith("image/")) {
        typeSource = "image";
      }
    }

    if (!contenu && typeSource !== "image") {
      return res.status(400).json({ error: "Aucun contenu fourni." });
    }

    const correction = await corrigerECE(contenu, typeSource, req.file?.path, mimetype);

    const result = db
      .prepare(
        `INSERT INTO corrections_ece (titre, matiere, nom_fichier, type_source, correction_json)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(correction.titre, correction.matiere, nomFichier, typeSource, JSON.stringify(correction));

    res.json({ id: result.lastInsertRowid, correction });
  } catch (err) {
    console.error(err);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "Réponse JSON invalide. Réessaie." });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ece
router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT id, titre, matiere, type_source, nom_fichier, created_at, correction_json FROM corrections_ece ORDER BY created_at DESC")
    .all();
  res.json(rows.map((row) => ({ ...row, correction: JSON.parse(row.correction_json) })));
});

// GET /api/ece/:id
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM corrections_ece WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Correction introuvable." });
  res.json({ ...row, correction: JSON.parse(row.correction_json) });
});

// DELETE /api/ece/:id
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM corrections_ece WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
