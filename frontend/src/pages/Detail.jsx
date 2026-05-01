import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SyntheseCard from "../components/SyntheseCard.jsx";
import styles from "./Detail.module.css";

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/syntheses/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Supprimer cette synthèse ?")) return;
    await fetch(`/api/syntheses/${id}`, { method: "DELETE" });
    navigate("/mes-syntheses");
  };

  if (loading) return <div className={styles.center}><div className={styles.spinner} /></div>;
  if (!data) return <p style={{ color: "var(--danger)" }}>Synthèse introuvable.</p>;

  return (
    <div>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/mes-syntheses")}>
          ← Mes synthèses
        </button>
        <button className={styles.deleteBtn} onClick={handleDelete}>
          Supprimer
        </button>
      </div>
      <SyntheseCard synthese={data.synthese} full />
    </div>
  );
}
