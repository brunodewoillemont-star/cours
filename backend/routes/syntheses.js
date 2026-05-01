import { Router } from "express";
import multer from "multer";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import db from "../db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Compatible Groq (gratuit) et OpenAI — configuré via .env
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Modèle texte/PDF — le plus puissant de Groq, gratuit
const MODEL_TEXTE = "llama-3.3-70b-versatile";
// Modèle vision pour les images scannées
const MODEL_IMAGE = "llama-3.2-11b-vision-preview";

const storage = multer.diskStorage({
  destination: join(__dirname, "../uploads"),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith("text/")) {
      cb(null, true);
    } else {
      cb(new Error("Type de fichier non supporté"));
    }
  },
});

const SYSTEM_PROMPT = `Tu es un assistant pédagogique expert qui aide des lycéens à synthétiser leurs cours.
Tu analyses le contenu d'un cours et tu produis une synthèse structurée, claire et facile à mémoriser.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans balises de code, sans texte avant ou après.`;

const JSON_SCHEMA = `{
  "titre": "Titre du chapitre détecté ou déduit",
  "matiere": "Matière probable (ex: Mathématiques, Histoire...)",
  "idees_principales": ["idée 1", "idée 2", "idée 3"],
  "definitions": [{"terme": "mot", "definition": "explication claire"}],
  "plan_revision": ["Étape 1 : ...", "Étape 2 : ...", "Étape 3 : ..."],
  "resume_court": "Un paragraphe de 3-4 phrases résumant l'essentiel du cours."
}`;

async function genererSynthese(contenu, typeSource, fichierPath, mimetype) {
  let response;

  if (typeSource === "image" && fichierPath) {
    const imageData = readFileSync(fichierPath).toString("base64");
    const mediaType = mimetype || "image/jpeg";

    response = await client.chat.completions.create({
      model: MODEL_IMAGE,
      max_tokens: 2000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mediaType};base64,${imageData}` },
            },
            {
              type: "text",
              text: `Analyse ce cours et génère une synthèse au format JSON strict :\n${JSON_SCHEMA}`,
            },
          ],
        },
      ],
    });
  } else {
    response = await client.chat.completions.create({
      model: MODEL_TEXTE,
      max_tokens: 2000,
      // response_format garantit du JSON pur (supporté par Groq)
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Voici le contenu d'un cours à synthétiser :\n\n<cours>\n${contenu}\n</cours>\n\nGénère une synthèse au format JSON strict :\n${JSON_SCHEMA}`,
        },
      ],
    });
  }

  const raw = response.choices[0].message.content.trim();
  return JSON.parse(raw);
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

    const result = db
      .prepare(
        `INSERT INTO syntheses (titre, contenu_original, nom_fichier, type_source, synthese_json)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(synthese.titre, contenu.slice(0, 5000), nomFichier, typeSource, JSON.stringify(synthese));

    res.json({ id: result.lastInsertRowid, synthese });
  } catch (err) {
    console.error(err);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "Réponse JSON invalide du modèle. Réessaie." });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/syntheses
router.get("/", (req, res) => {
  const rows = db
    .prepare(
      "SELECT id, titre, matiere, type_source, nom_fichier, created_at, synthese_json FROM syntheses ORDER BY created_at DESC"
    )
    .all();
  res.json(rows.map((row) => ({ ...row, synthese: JSON.parse(row.synthese_json) })));
});

// GET /api/syntheses/:id
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM syntheses WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Synthèse introuvable." });
  res.json({ ...row, synthese: JSON.parse(row.synthese_json) });
});

// DELETE /api/syntheses/:id
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM syntheses WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
