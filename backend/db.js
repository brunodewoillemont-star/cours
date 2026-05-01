import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "syntheses.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS syntheses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    contenu_original TEXT,
    nom_fichier TEXT,
    type_source TEXT DEFAULT 'texte',
    synthese_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS corrections_ece (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    matiere TEXT,
    nom_fichier TEXT,
    type_source TEXT DEFAULT 'texte',
    correction_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS exercices_maths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    chapitre TEXT,
    difficulte TEXT,
    type TEXT DEFAULT 'exercice',
    exercice_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

export default db;
