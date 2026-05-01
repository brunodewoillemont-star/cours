import { Router } from "express";
import multer from "multer";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import db from "../db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();
const client = new Anthropic();

const storage = multer.diskStorage({
  destination: join(__dirname, "../uploads"),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname}`;
    cb(null, unique);
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

async function genererSynthese(contenu, typeSource, fichierPath, mimetype) {
  let messages;

  if (typeSource === "image" && fichierPath) {
    const imageData = readFileSync(fichierPath).toString("base64");
    const mediaType = mimetype || "image/jpeg";
    messages = [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageData },
          },
          {
            type: "text",
            text: `Analyse ce cours et génère une synthèse structurée au format JSON strict :
{
  "titre": "Titre du chapitre détecté",
  "matiere": "Matière probable (ex: Mathématiques, Histoire...)",
  "idees_principales": ["idée 1", "idée 2", "idée 3"],
  "definitions": [{"terme": "mot", "definition": "explication claire"}],
  "plan_revision": ["Étape 1 : ...", "Étape 2 : ...", "Étape 3 : ..."],
  "resume_court": "Un paragraphe de 3-4 phrases résumant l'essentiel du cours."
}`,
          },
        ],
      },
    ];
  } else {
    messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Voici le contenu d'un cours à synthétiser :

<cours>
${contenu}
</cours>

Génère une synthèse structurée au format JSON strict :
{
  "titre": "Titre du chapitre détecté ou déduit",
  "matiere": "Matière probable (ex: Mathématiques, Histoire...)",
  "idees_principales": ["idée 1", "idée 2", "idée 3"],
  "definitions": [{"terme": "mot", "definition": "explication claire"}],
  "plan_revision": ["Étape 1 : ...", "Étape 2 : ...", "Étape 3 : ..."],
  "resume_court": "Un paragraphe de 3-4 phrases résumant l'essentiel du cours."
}`,
          },
        ],
      },
    ];
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const raw = response.content[0].text.trim();
  return JSON.parse(raw);
}

// POST /api/syntheses/generer — texte ou PDF
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

    const synthese = await genererSynthese(
      contenu,
      typeSource,
      req.file?.path,
      mimetype
    );

    const stmt = db.prepare(`
      INSERT INTO syntheses (titre, contenu_original, nom_fichier, type_source, synthese_json)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      synthese.titre,
      contenu.slice(0, 5000),
      nomFichier,
      typeSource,
      JSON.stringify(synthese)
    );

    res.json({ id: result.lastInsertRowid, synthese });
  } catch (err) {
    console.error(err);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "Erreur de parsing JSON depuis Claude. Réessaie." });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/syntheses — liste toutes les synthèses
router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT id, titre, matiere, type_source, nom_fichier, created_at, synthese_json FROM syntheses ORDER BY created_at DESC")
    .all();

  const syntheses = rows.map((row) => ({
    ...row,
    synthese: JSON.parse(row.synthese_json),
  }));

  res.json(syntheses);
});

// GET /api/syntheses/:id
router.get("/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM syntheses WHERE id = ?")
    .get(req.params.id);

  if (!row) return res.status(404).json({ error: "Synthèse introuvable." });

  res.json({ ...row, synthese: JSON.parse(row.synthese_json) });
});

// DELETE /api/syntheses/:id
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM syntheses WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
