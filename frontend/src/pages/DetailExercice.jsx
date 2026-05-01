import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ExerciceCard from "../components/ExerciceCard.jsx";
import styles from "./Detail.module.css";
import exStyles from "./Exercices.module.css";

export default function DetailExercice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCorrection, setShowCorrection] = useState(false);

  useEffect(() => {
    fetch(`/api/exercices/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Supprimer cet exercice ?")) return;
    await fetch(`/api/exercices/${id}`, { method: "DELETE" });
    navigate("/mes-exercices");
  };

  if (loading) return <div className={styles.center}><div className={styles.spinner} /></div>;
  if (!data) return <p style={{ color: "var(--danger)" }}>Exercice introuvable.</p>;

  return (
    <div>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/mes-exercices")}>← Mes exercices</button>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className={`${exStyles.correctionBtn} ${showCorrection ? exStyles.correctionActive : ""}`}
            onClick={() => setShowCorrection((v) => !v)}
          >
            {showCorrection ? "🙈 Masquer" : "✅ Correction"}
          </button>
          <button className={styles.deleteBtn} onClick={handleDelete}>Supprimer</button>
        </div>
      </div>
      <ExerciceCard exercice={data.exercice} showCorrection={showCorrection} />
    </div>
  );
}
