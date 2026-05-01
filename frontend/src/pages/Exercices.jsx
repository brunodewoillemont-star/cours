import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ExerciceCard from "../components/ExerciceCard.jsx";
import styles from "./Exercices.module.css";

const DIFFICULTES = ["Facile", "Moyen", "Difficile", "Style Bac"];

export default function Exercices() {
  const [chapitres, setChapitres] = useState({ tronc_commun: [], maths_expertes: [] });
  const [chapitre, setChapitre] = useState("");
  const [difficulte, setDifficulte] = useState("Moyen");
  const [type, setType] = useState("exercice");
  const [loading, setLoading] = useState(false);
  const [exercice, setExercice] = useState(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/exercices/chapitres")
      .then((r) => r.json())
      .then(setChapitres)
      .catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (type !== "sujet_complet" && !chapitre) {
      setError("Choisis un chapitre.");
      return;
    }
    setError("");
    setExercice(null);
    setShowCorrection(false);
    setLoading(true);
    try {
      const res = await fetch("/api/exercices/generer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapitre, difficulte, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setExercice({ id: data.id, ...data.exercice });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (exercice) {
    return (
      <div>
        <div className={styles.resultHeader}>
          <button className={styles.backBtn} onClick={() => { setExercice(null); setShowCorrection(false); }}>
            ← Nouvel exercice
          </button>
          <div className={styles.resultActions}>
            <button
              className={`${styles.correctionBtn} ${showCorrection ? styles.correctionActive : ""}`}
              onClick={() => setShowCorrection((v) => !v)}
            >
              {showCorrection ? "🙈 Masquer la correction" : "✅ Voir la correction"}
            </button>
            <button className={styles.saveBtn} onClick={() => navigate("/mes-exercices")}>
              Mes exercices
            </button>
          </div>
        </div>
        <ExerciceCard exercice={exercice} showCorrection={showCorrection} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.badge}>Maths Terminale</div>
        <h1 className={styles.title}>Générateur d'exercices Bac</h1>
        <p className={styles.subtitle}>
          Exercices style Bac conformes au programme officiel de Terminale Générale — option Mathématiques Expertes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Type */}
        <div className={styles.typeGrid}>
          <button
            type="button"
            className={`${styles.typeCard} ${type === "exercice" ? styles.typeActive : ""}`}
            onClick={() => setType("exercice")}
          >
            <span className={styles.typeIcon}>📝</span>
            <strong>Exercice ciblé</strong>
            <p>Un exercice sur un chapitre précis</p>
          </button>
          <button
            type="button"
            className={`${styles.typeCard} ${type === "sujet_complet" ? styles.typeActive : ""}`}
            onClick={() => { setType("sujet_complet"); setChapitre(""); }}
          >
            <span className={styles.typeIcon}>📋</span>
            <strong>Sujet complet Bac</strong>
            <p>3 exercices · 20 pts · 3h — comme le vrai Bac</p>
          </button>
        </div>

        {/* Chapitre */}
        {type === "exercice" && (
          <div className={styles.section}>
            <label className={styles.label}>Chapitre</label>
            <div className={styles.chapitresWrapper}>
              <p className={styles.groupLabel}>Tronc commun</p>
              <div className={styles.chipGrid}>
                {chapitres.tronc_commun.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.chip} ${chapitre === c ? styles.chipActive : ""}`}
                    onClick={() => setChapitre(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className={styles.groupLabel}>Mathématiques Expertes</p>
              <div className={styles.chipGrid}>
                {chapitres.maths_expertes.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.chip} ${styles.chipExpert} ${chapitre === c ? styles.chipExpertActive : ""}`}
                    onClick={() => setChapitre(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Difficulté */}
        {type === "exercice" && (
          <div className={styles.section}>
            <label className={styles.label}>Difficulté</label>
            <div className={styles.diffGrid}>
              {DIFFICULTES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`${styles.diffBtn} ${difficulte === d ? styles.diffActive : ""} ${styles[`diff${d.replace(" ", "")}`]}`}
                  onClick={() => setDifficulte(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? (
            <><span className={styles.spinner} />Génération en cours… (peut prendre 15-20s)</>
          ) : type === "sujet_complet" ? (
            "📋 Générer le sujet complet"
          ) : (
            "➕ Générer l'exercice"
          )}
        </button>
      </form>
    </div>
  );
}
