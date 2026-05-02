import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS syntheses (
    id SERIAL PRIMARY KEY,
    titre TEXT NOT NULL,
    contenu_original TEXT,
    nom_fichier TEXT,
    type_source TEXT DEFAULT 'texte',
    synthese_json TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS corrections_ece (
    id SERIAL PRIMARY KEY,
    titre TEXT NOT NULL,
    matiere TEXT,
    nom_fichier TEXT,
    type_source TEXT DEFAULT 'texte',
    correction_json TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS exercices_maths (
    id SERIAL PRIMARY KEY,
    titre TEXT NOT NULL,
    chapitre TEXT,
    difficulte TEXT,
    type TEXT DEFAULT 'exercice',
    exercice_json TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`);

export default pool;
