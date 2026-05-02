import { Router } from "express";
import OpenAI from "openai";
import db from "../db.js";

const router = Router();
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const MODEL = "llama-3.3-70b-versatile";

export const CHAPITRES = {
  tronc_commun: [
    "Suites numériques",
    "Limites et continuité",
    "Dérivation et convexité",
    "Fonction exponentielle",
    "Fonction logarithme",
    "Intégration",
    "Probabilités et variables aléatoires discrètes",
    "Loi binomiale",
    "Loi normale et intervalle de fluctuation",
    "Géométrie dans l'espace",
    "Produit scalaire dans l'espace",
  ],
  maths_expertes: [
    "Arithmétique (congruences, PGCD, Bézout)",
    "Matrices et systèmes linéaires",
    "Nombres complexes",
  ],
};

const SYSTEM_PROMPT = `Tu es un professeur de mathématiques expert qui rédige des exercices de Baccalauréat Terminale Générale option Mathématiques Expertes.
Règles ABSOLUES :
- Énoncés rigoureux, précis et conformes au programme officiel.
- Calculs et résultats EXACTS dans les corrections.
- Les questions s'enchaînent logiquement.
- Réponds UNIQUEMENT avec un objet JSON valide, rien avant ni après, pas de balises markdown.`;

const SCHEMA = `{
  "titre": "Titre de l'exercice",
  "chapitre": "Chapitre",
  "difficulte": "Facile|Moyen|Difficile|Style Bac",
  "duree_estimee": "20 minutes",
  "points_total": 7,
  "notions": ["notion 1", "notion 2"],
  "exercices": [
    {
      "numero": "Exercice 1",
      "titre": "Titre",
      "points": 7,
      "enonce_intro": "Contexte ou introduction de l'exercice.",
      "questions": [
        {"numero": "1.", "enonce": "Énoncé de la question.", "points": 2},
        {"numero": "2. a.", "enonce": "Énoncé de la sous-question.", "points": 1},
        {"numero": "2. b.", "enonce": "Énoncé de la sous-question.", "points": 2}
      ],
      "correction": [
        {"numero": "1.", "solution": "Solution complète avec tous les calculs détaillés.", "methode": "Conseil méthodologique."},
        {"numero": "2. a.", "solution": "Solution complète.", "methode": ""},
        {"numero": "2. b.", "solution": "Solution complète.", "methode": ""}
      ]
    }
  ]
}`;

const SCHEMA_SUJET = `{
  "titre": "Sujet Baccalauréat — Mathématiques Terminale Générale",
  "difficulte": "Style Bac",
  "duree_estimee": "3 heures",
  "points_total": 20,
  "notions": ["notion 1", "notion 2", "notion 3"],
  "exercices": [
    {
      "numero": "Exercice 1",
      "titre": "Titre",
      "points": 6,
      "enonce_intro": "Contexte.",
      "questions": [
        {"numero": "1.", "enonce": "...", "points": 2},
        {"numero": "2.", "enonce": "...", "points": 2},
        {"numero": "3.", "enonce": "...", "points": 2}
      ],
      "correction": [
        {"numero": "1.", "solution": "...", "methode": "..."},
        {"numero": "2.", "solution": "...", "methode": "..."},
        {"numero": "3.", "solution": "...", "methode": "..."}
      ]
    },
    {
      "numero": "Exercice 2",
      "titre": "Titre",
      "points": 7,
      "enonce_intro": "Contexte.",
      "questions": [{"numero": "1.", "enonce": "...", "points": 2}],
      "correction": [{"numero": "1.", "solution": "...", "methode": "..."}]
    },
    {
      "numero": "Exercice 3",
      "titre": "Titre",
      "points": 7,
      "enonce_intro": "Contexte.",
      "questions": [{"numero": "1.", "enonce": "...", "points": 2}],
      "correction": [{"numero": "1.", "solution": "...", "methode": "..."}]
    }
  ]
}`;

function extractJSON(text) {
  const clean = text.trim();
  const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) return JSON.parse(mdMatch[1].trim());
  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) return JSON.parse(objMatch[0]);
  return JSON.parse(clean);
}

async function genererExercice({ chapitre, difficulte, type }) {
  const isSujet = type === "sujet_complet";

  const userPrompt = isSujet
    ? `Génère un sujet complet de Baccalauréat Terminale Générale option Mathématiques Expertes.
3 exercices indépendants couvrant des chapitres variés. Total 20 pts. Niveau conforme au vrai Bac.
Chaque exercice doit avoir 3 à 4 questions avec corrections complètes.
Réponds UNIQUEMENT avec ce JSON :\n${SCHEMA_SUJET}`
    : `Génère un exercice de Terminale Générale option Mathématiques Expertes.
Chapitre : ${chapitre}
Difficulté : ${difficulte}
4 à 5 questions progressives avec corrections détaillées.
Réponds UNIQUEMENT avec ce JSON :\n${SCHEMA}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: isSujet ? 7000 : 4000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = response.choices[0].message.content.trim();
  return extractJSON(raw);
}

// POST /api/exercices/generer
router.post("/generer", async (req, res) => {
  try {
    const { chapitre, difficulte = "Moyen", type = "exercice" } = req.body;

    if (type !== "sujet_complet" && !chapitre) {
      return res.status(400).json({ error: "Chapitre requis." });
    }

    const exercice = await genererExercice({ chapitre, difficulte, type });

    const result = await db.query(
      `INSERT INTO exercices_maths (titre, chapitre, difficulte, type, exercice_json)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        exercice.titre,
        type === "sujet_complet" ? "Sujet complet" : chapitre,
        difficulte,
        type,
        JSON.stringify(exercice),
      ]
    );

    res.json({ id: result.rows[0].id, exercice });
  } catch (err) {
    console.error(err);
    if (err instanceof SyntaxError) return res.status(500).json({ error: "Réponse JSON invalide. Réessaie." });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exercices/chapitres
router.get("/chapitres", (req, res) => res.json(CHAPITRES));

// GET /api/exercices
router.get("/", async (req, res) => {
  const result = await db.query(
    "SELECT id, titre, chapitre, difficulte, type, created_at FROM exercices_maths ORDER BY created_at DESC"
  );
  res.json(result.rows);
});

// GET /api/exercices/:id
router.get("/:id", async (req, res) => {
  const result = await db.query("SELECT * FROM exercices_maths WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: "Exercice introuvable." });
  const row = result.rows[0];
  res.json({ ...row, exercice: JSON.parse(row.exercice_json) });
});

// DELETE /api/exercices/:id
router.delete("/:id", async (req, res) => {
  await db.query("DELETE FROM exercices_maths WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

export default router;
