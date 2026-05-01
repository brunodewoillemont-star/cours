import styles from "./CorrectionCard.module.css";

export default function CorrectionCard({ correction }) {
  if (!correction) return null;

  const {
    titre,
    matiere,
    contexte,
    correction_questions = [],
    manipulation = {},
    methode_generale,
    mots_cles = [],
  } = correction;

  const { protocole = [], astuces = [], erreurs_courantes = [], securite = [] } = manipulation;

  return (
    <div className={styles.card}>
      <div className={styles.topBar}>
        {matiere && <span className={styles.matiereBadge}>{matiere}</span>}
        <span className={styles.eceBadge}>ECE Bac</span>
      </div>

      <h1 className={styles.titre}>{titre}</h1>

      {contexte && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}><span>📋</span> Contexte du sujet</h2>
          <p className={styles.contexte}>{contexte}</p>
        </section>
      )}

      {correction_questions.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}><span>✏️</span> Correction des questions</h2>
          <div className={styles.questions}>
            {correction_questions.map((q, i) => (
              <div key={i} className={styles.questionCard}>
                <div className={styles.questionHeader}>
                  <span className={styles.questionNum}>{q.numero || `Q${i + 1}`}</span>
                  {q.enonce && <p className={styles.questionEnonce}>{q.enonce}</p>}
                </div>
                <p className={styles.questionReponse}>{q.reponse}</p>
                {q.points_cles?.length > 0 && (
                  <div className={styles.pointsCles}>
                    <p className={styles.pointsClesTitle}>Points clés attendus :</p>
                    <ul>
                      {q.points_cles.map((p, j) => (
                        <li key={j}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {(protocole.length > 0 || astuces.length > 0 || erreurs_courantes.length > 0) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}><span>🔬</span> Manipulation & Protocole</h2>
          <div className={styles.manipGrid}>
            {protocole.length > 0 && (
              <div className={styles.manipBlock}>
                <h3 className={styles.manipTitle}>Protocole</h3>
                <ol className={styles.manipList}>
                  {protocole.map((step, i) => (
                    <li key={i}><span className={styles.stepNum}>{i + 1}</span>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {astuces.length > 0 && (
              <div className={`${styles.manipBlock} ${styles.astuces}`}>
                <h3 className={styles.manipTitle}>💡 Astuces pratiques</h3>
                <ul className={styles.manipList}>
                  {astuces.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}

            {erreurs_courantes.length > 0 && (
              <div className={`${styles.manipBlock} ${styles.erreurs}`}>
                <h3 className={styles.manipTitle}>⚠️ Erreurs à éviter</h3>
                <ul className={styles.manipList}>
                  {erreurs_courantes.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {securite.length > 0 && (
              <div className={`${styles.manipBlock} ${styles.securite}`}>
                <h3 className={styles.manipTitle}>🛡️ Sécurité</h3>
                <ul className={styles.manipList}>
                  {securite.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {methode_generale && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}><span>🎯</span> Méthode générale</h2>
          <p className={styles.methode}>{methode_generale}</p>
        </section>
      )}

      {mots_cles.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}><span>🏷️</span> Mots-clés</h2>
          <div className={styles.tags}>
            {mots_cles.map((tag, i) => <span key={i} className={styles.tag}>{tag}</span>)}
          </div>
        </section>
      )}
    </div>
  );
}
