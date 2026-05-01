import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CorrectionCard from "../components/CorrectionCard.jsx";
import styles from "./Detail.module.css";

export default function DetailECE() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ece/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Supprimer cette correction ?")) return;
    await fetch(`/api/ece/${id}`, { method: "DELETE" });
    navigate("/mes-ece");
  };

  if (loading) return <div className={styles.center}><div className={styles.spinner} /></div>;
  if (!data) return <p style={{ color: "var(--danger)" }}>Correction introuvable.</p>;

  return (
    <div>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/mes-ece")}>← Mes corrections ECE</button>
        <button className={styles.deleteBtn} onClick={handleDelete}>Supprimer</button>
      </div>
      <CorrectionCard correction={data.correction} />
    </div>
  );
}
