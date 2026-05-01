import styles from "./ExerciceCard.module.css";

const DIFF_COLORS = {
  Facile: { bg: "#d1fae5", color: "#065f46" },
  Moyen: { bg: "#fef3c7", color: "#92400e" },
  Difficile: { bg: "#fee2e2", color: "#991b1b" },
  "Style Bac": { bg: "#ede9fe", color: "#5b21b6" },
};

export default function ExerciceCard({ exercice, showCorrection = false }) {
  if (!exercice) return null;

  const { titre, chapitre, difficulte, duree_estimee, points_total, notions = [], exercices = [] } = exercice;
  const diffStyle = DIFF_COLORS[difficulte] || DIFF_COLORS["Moyen"];

  return (
    <div className={styles.card}>
      {/* En-tête */}
      <div className={styles.header}>
        <div className={styles.badges}>
          {chapitre && <span className={styles.chapitreBadge}>{chapitre}</span>}
          <span className={styles.diffBadge} style={{ background: diffStyle.bg, color: diffStyle.color }}>
            {difficulte}
          </span>
        </div>
        <div className={styles.meta}>
          {duree_estimee && <span>⏱ {duree_estimee}</span>}
          {points_total && <span>📊 {points_total} pts</span>}
        </div>
      </div>

      <h1 className={styles.titre}>{titre}</h1>

      {notions.length > 0 && (
        <div className={styles.notions}>
          {notions.map((n, i) => <span key={i} className={styles.notion}>{n}</span>)}
        </div>
      )}

      {/* Exercices */}
      {exercices.map((ex, ei) => (
        <div key={ei} className={styles.exercice}>
          <div className={styles.exerciceHeader}>
            <h2 className={styles.exerciceTitle}>
              {ex.numero}{ex.titre ? ` — ${ex.titre}` : ""}
            </h2>
            {ex.points && <span className={styles.pts}>{ex.points} pts</span>}
          </div>

          {ex.enonce_intro && <p className={styles.intro}>{ex.enonce_intro}</p>}

          {/* Questions */}
          <div className={styles.questions}>
            {(ex.questions || []).map((q, qi) => (
              <div key={qi} className={styles.question}>
                <div className={styles.questionLine}>
                  <span className={styles.qNum}>{q.numero}</span>
                  <p className={styles.qEnonce}>{q.enonce}</p>
                  {q.points > 0 && <span className={styles.qPts}>{q.points} pt{q.points > 1 ? "s" : ""}</span>}
                </div>
                {/* Sous-questions */}
                {(q.sous_questions || []).map((sq, sqi) => (
                  <div key={sqi} className={styles.sousQuestion}>
                    <span className={styles.sqNum}>{sq.numero}</span>
                    <p className={styles.qEnonce}>{sq.enonce}</p>
                    {sq.points > 0 && <span className={styles.qPts}>{sq.points} pt{sq.points > 1 ? "s" : ""}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Correction */}
          {showCorrection && (ex.correction || []).length > 0 && (
            <div className={styles.correction}>
              <h3 className={styles.correctionTitle}>✅ Correction</h3>
              {(ex.correction || []).map((c, ci) => (
                <div key={ci} className={styles.correctionItem}>
                  <div className={styles.correctionHeader}>
                    <span className={styles.corrNum}>{c.numero}</span>
                    {c.methode && <span className={styles.methode}>💡 {c.methode}</span>}
                  </div>
                  <p className={styles.solution}>{c.solution}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
