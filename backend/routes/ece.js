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

const SYSTEM_PROMPT = `Tu es un professeur de lycée expert en sciences (Physique-Chimie, SVT, etc.) spécialisé dans la préparation aux ECE du Baccalauréat français.
Règles ABSOLUES :
- Tu DOIS répondre à TOUTES les questions du sujet sans en sauter aucune.
- Chaque réponse doit être LONGUE, COMPLÈTE et RÉDIGÉE comme un élève de terminale qui veut le maximum de points.
- Cite les grandeurs, unités, formules, lois et raisonnements attendus par le correcteur.
- Les astuces de manipulation doivent être concrètes et issues de la pratique réelle en laboratoire.
- Réponds UNIQUEMENT avec un objet JSON valide, rien avant ni après.
- N'inclus JAMAIS le texte brut du sujet dans ta réponse.`;

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
    "protocole": ["Étape 1 : ...", "Étape 2 : ..."],
    "astuces": ["Astuce pratique 1", "Astuce 2"],
    "erreurs_courantes": ["Erreur fréquente à éviter 1"],
    "securite": ["Consigne de sécurité 1 si applicable"]
  },
  "methode_generale": "Conseils méthodologiques pour aborder ce type d'ECE.",
  "mots_cles": ["mot-clé 1", "mot-clé 2"]
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
            { type: "text", text: `Corrige ce sujet d'ECE au format JSON strict :\n${JSON_SCHEMA}` },
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
          content: `Voici le sujet d'ECE à corriger :\n\n<sujet>\n${contenuTronque}\n</sujet>\n\nInstructions : réponds à TOUTES les questions. Génère la correction au format JSON strict :\n${JSON_SCHEMA}`,
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

    const result = await db.query(
      `INSERT INTO corrections_ece (titre, matiere, nom_fichier, type_source, correction_json)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [correction.titre, correction.matiere, nomFichier, typeSource, JSON.stringify(correction)]
    );

    res.json({ id: result.rows[0].id, correction });
  } catch (err) {
    console.error(err);
    if (err instanceof SyntaxError) return res.status(500).json({ error: "Réponse JSON invalide. Réessaie." });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ece
router.get("/", async (req, res) => {
  const result = await db.query(
    "SELECT id, titre, matiere, type_source, nom_fichier, created_at, correction_json FROM corrections_ece ORDER BY created_at DESC"
  );
  res.json(result.rows.map((row) => ({ ...row, correction: JSON.parse(row.correction_json) })));
});

// GET /api/ece/:id
router.get("/:id", async (req, res) => {
  const result = await db.query("SELECT * FROM corrections_ece WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: "Correction introuvable." });
  const row = result.rows[0];
  res.json({ ...row, correction: JSON.parse(row.correction_json) });
});

// DELETE /api/ece/:id
router.delete("/:id", async (req, res) => {
  await db.query("DELETE FROM corrections_ece WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

export default router;
