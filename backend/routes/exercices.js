import { Router } from "express";
import OpenAI from "openai";
import db from "../db.js";

const router = Router();
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const MODEL = "llama-3.3-70b-versatile";

// Programme officiel Terminale Générale
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

const SYSTEM_PROMPT = `Tu es un professeur de mathématiques de classe préparatoire qui rédige des sujets de Baccalauréat Terminale Générale pour des élèves de l'option Mathématiques Expertes.
Tes exercices sont RIGOUREUX, COHÉRENTS mathématiquement et conformes au programme officiel.
Règles absolues :
- Les énoncés sont clairs, précis, sans ambiguïté, comme dans un vrai sujet du Bac.
- Les calculs et résultats dans les corrections sont EXACTS et vérifiés.
- Chaque question s'appuie logiquement sur la précédente (les résultats des parties précédentes sont réutilisés).
- Le barème est réaliste (total cohérent avec la difficulté).
- Réponds UNIQUEMENT avec un objet JSON valide, rien avant ni après.`;

const SCHEMA_EXERCICE = `{
  "titre": "Titre de l'exercice",
  "chapitre": "Chapitre concerné",
  "difficulte": "Facile|Moyen|Difficile|Style Bac",
  "duree_estimee": "XX minutes",
  "points_total": 7,
  "notions": ["notion 1", "notion 2", "notion 3"],
  "contexte": "Mise en contexte de l'exercice (optionnel, comme dans les vrais sujets)",
  "exercices": [
    {
      "numero": "Exercice 1",
      "titre": "Titre optionnel",
      "points": 7,
      "enonce_intro": "Introduction générale de l'exercice si nécessaire",
      "questions": [
        {
          "numero": "1.",
          "enonce": "Énoncé complet de la question, précis et rigoureux.",
          "points": 2,
          "sous_questions": []
        },
        {
          "numero": "2.",
          "enonce": "...",
          "points": 3,
          "sous_questions": [
            {"numero": "a.", "enonce": "...", "points": 1},
            {"numero": "b.", "enonce": "...", "points": 2}
          ]
        }
      ],
      "correction": [
        {
          "numero": "1.",
          "solution": "Solution complète, rédigée, avec tous les calculs intermédiaires justifiés.",
          "methode": "Conseil méthodologique pour cette question."
        },
        {
          "numero": "2.a.",
          "solution": "...",
          "methode": "..."
        }
      ]
    }
  ]
}`;

const SCHEMA_SUJET_COMPLET = `{
  "titre": "Sujet de Baccalauréat - Mathématiques Terminale Générale",
  "difficulte": "Style Bac",
  "duree_estimee": "3 heures",
  "points_total": 20,
  "notions": ["liste des notions abordées"],
  "exercices": [
    {
      "numero": "Exercice 1",
      "titre": "Titre de l'exercice",
      "points": 6,
      "enonce_intro": "...",
      "questions": [...],
      "correction": [...]
    },
    {
      "numero": "Exercice 2",
      "titre": "...",
      "points": 7,
      "questions": [...],
      "correction": [...]
    },
    {
      "numero": "Exercice 3",
      "titre": "...",
      "points": 7,
      "questions": [...],
      "correction": [...]
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
  const isSujetComplet = type === "sujet_complet";

  const prompt = isSujetComplet
    ? `Génère un sujet complet de Baccalauréat Terminale Générale option Mathématiques Expertes.
Le sujet doit comporter 3 exercices indépendants couvrant des chapitres variés du programme (tronc commun + expertes).
Total : 20 points. Durée : 3h. Niveau : conforme aux vrais sujets du Bac.
Génère le sujet au format JSON strict :\n${SCHEMA_SUJET_COMPLET}`
    : `Génère un exercice de Baccalauréat Terminale Générale option Mathématiques Expertes.
Chapitre : ${chapitre}
Difficulté : ${difficulte}
L'exercice doit comporter 3 à 5 questions progressives (certaines avec sous-questions a, b, c).
Les questions doivent s'enchaîner logiquement, les résultats des premières questions étant réutilisés ensuite.
Génère l'exercice au format JSON strict :\n${SCHEMA_EXERCICE}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 6000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
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

    const result = db
      .prepare(
        `INSERT INTO exercices_maths (titre, chapitre, difficulte, type, exercice_json)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        exercice.titre,
        type === "sujet_complet" ? "Sujet complet" : chapitre,
        difficulte,
        type,
        JSON.stringify(exercice)
      );

    res.json({ id: result.lastInsertRowid, exercice });
  } catch (err) {
    console.error(err);
    if (err instanceof SyntaxError) return res.status(500).json({ error: "Réponse JSON invalide. Réessaie." });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exercices/chapitres
router.get("/chapitres", (req, res) => res.json(CHAPITRES));

// GET /api/exercices
router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT id, titre, chapitre, difficulte, type, created_at FROM exercices_maths ORDER BY created_at DESC")
    .all();
  res.json(rows);
});

// GET /api/exercices/:id
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM exercices_maths WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Exercice introuvable." });
  res.json({ ...row, exercice: JSON.parse(row.exercice_json) });
});

// DELETE /api/exercices/:id
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM exercices_maths WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
