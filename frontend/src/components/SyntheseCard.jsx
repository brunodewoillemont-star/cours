import styles from "./SyntheseCard.module.css";

export default function SyntheseCard({ synthese, full = false }) {
  if (!synthese) return null;

  const {
    titre,
    matiere,
    idees_principales = [],
    definitions = [],
    plan_revision = [],
    resume_court,
  } = synthese;

  return (
    <div className={styles.card}>
      <div className={styles.topBar}>
        {matiere && <span className={styles.matiereBadge}>{matiere}</span>}
      </div>

      <h1 className={styles.titre}>{titre}</h1>

      {resume_court && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.icon}>💡</span> Résumé
          </h2>
          <p className={styles.resume}>{resume_court}</p>
        </section>
      )}

      {idees_principales.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.icon}>🎯</span> Idées principales
          </h2>
          <ul className={styles.list}>
            {idees_principales.map((idee, i) => (
              <li key={i} className={styles.listItem}>
                <span className={styles.bullet}>{i + 1}</span>
                {idee}
              </li>
            ))}
          </ul>
        </section>
      )}

      {definitions.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.icon}>📖</span> Définitions importantes
          </h2>
          <div className={styles.defsGrid}>
            {definitions.map((def, i) => (
              <div key={i} className={styles.defCard}>
                <span className={styles.defTerme}>{def.terme}</span>
                <p className={styles.defDef}>{def.definition}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {plan_revision.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.icon}>📋</span> Plan de révision
          </h2>
          <ol className={styles.planList}>
            {plan_revision.map((step, i) => (
              <li key={i} className={styles.planItem}>
                <span className={styles.planNum}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
