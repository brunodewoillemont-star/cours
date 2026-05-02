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

const SYSTEM_PROMPT = `Tu es un assistant pédagogique expert qui aide des lycéens à synthétiser leurs cours.
Tu produis des synthèses DÉTAILLÉES, riches et complètes — pas des résumés minimalistes.
Règles absolues :
- Réponds UNIQUEMENT avec un objet JSON valide, rien avant ni après.
- N'inclus JAMAIS le texte brut du cours dans ta réponse.
- Sois généreux : au moins 6 idées principales, au moins 5 définitions si le cours en contient, un plan de révision en 5 étapes minimum.
- Les idées principales doivent être des phrases complètes et explicatives, pas juste des titres.
- Les définitions doivent être claires, précises, avec des exemples si possible.
- Le résumé doit faire 5 à 8 phrases et couvrir tous les points importants.`;

const JSON_SCHEMA = `{
  "titre": "Titre complet du chapitre",
  "matiere": "Matière (ex: Mathématiques, Histoire-Géographie, Physique-Chimie, SVT, Philosophie...)",
  "resume_court": "Résumé complet en 5 à 8 phrases couvrant tous les points importants du cours.",
  "idees_principales": ["Phrase complète expliquant la 1ère idée clé avec contexte", "..."],
  "definitions": [{"terme": "Terme 1", "definition": "Définition précise et claire, avec exemple si utile."}],
  "plan_revision": ["Étape 1 : ...", "Étape 2 : ...", "... (5 étapes minimum)"]
}`;

function extractJSON(text) {
  const clean = text.trim();
  const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) return JSON.parse(mdMatch[1].trim());
  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) return JSON.parse(objMatch[0]);
  return JSON.parse(clean);
}

async function genererSynthese(contenu, typeSource, fichierPath, mimetype) {
  let response;

  if (typeSource === "image" && fichierPath) {
    const imageData = readFileSync(fichierPath).toString("base64");
    const mediaType = mimetype || "image/jpeg";
    response = await client.chat.completions.create({
      model: MODEL_IMAGE,
      max_tokens: 3000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageData}` } },
            { type: "text", text: `Analyse ce cours et génère une synthèse au format JSON strict :\n${JSON_SCHEMA}` },
          ],
        },
      ],
    });
  } else {
    const contenuTronque = contenu.length > 6000
      ? contenu.slice(0, 6000) + "\n[... cours tronqué pour la synthèse ...]"
      : contenu;

    response = await client.chat.completions.create({
      model: MODEL_TEXTE,
      max_tokens: 3000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Voici le contenu d'un cours à synthétiser :\n\n<cours>\n${contenuTronque}\n</cours>\n\nGénère une synthèse au format JSON strict. Réponds avec SEULEMENT ce JSON :\n${JSON_SCHEMA}`,
        },
      ],
    });
  }

  const raw = response.choices[0].message.content.trim();
  return extractJSON(raw);
}

// POST /api/syntheses/generer
router.post("/generer", upload.single("fichier"), async (req, res) => {
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

    const synthese = await genererSynthese(contenu, typeSource, req.file?.path, mimetype);

    const result = await db.query(
      `INSERT INTO syntheses (titre, contenu_original, nom_fichier, type_source, synthese_json)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [synthese.titre, contenu.slice(0, 5000), nomFichier, typeSource, JSON.stringify(synthese)]
    );

    res.json({ id: result.rows[0].id, synthese });
  } catch (err) {
    console.error(err);
    if (err instanceof SyntaxError) return res.status(500).json({ error: "Réponse JSON invalide. Réessaie." });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/syntheses
router.get("/", async (req, res) => {
  const result = await db.query(
    "SELECT id, titre, type_source, nom_fichier, created_at, synthese_json FROM syntheses ORDER BY created_at DESC"
  );
  res.json(result.rows.map((row) => ({ ...row, synthese: JSON.parse(row.synthese_json) })));
});

// GET /api/syntheses/:id
router.get("/:id", async (req, res) => {
  const result = await db.query("SELECT * FROM syntheses WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: "Synthèse introuvable." });
  const row = result.rows[0];
  res.json({ ...row, synthese: JSON.parse(row.synthese_json) });
});

// DELETE /api/syntheses/:id
router.delete("/:id", async (req, res) => {
  await db.query("DELETE FROM syntheses WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

export default router;
