import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./MesSyntheses.module.css";

const DIFF_COLORS = {
  Facile: { bg: "#d1fae5", color: "#065f46" },
  Moyen: { bg: "#fef3c7", color: "#92400e" },
  Difficile: { bg: "#fee2e2", color: "#991b1b" },
  "Style Bac": { bg: "#ede9fe", color: "#5b21b6" },
};

function formatDate(str) {
  const d = new Date(str.endsWith("Z") ? str : str + "Z");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function MesExercices() {
  const [exercices, setExercices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetch("/api/exercices")
      .then((r) => r.json())
      .then(setExercices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cet exercice ?")) return;
    setDeleting(id);
    await fetch(`/api/exercices/${id}`, { method: "DELETE" });
    setExercices((prev) => prev.filter((e) => e.id !== id));
    setDeleting(null);
  };

  const filtered = exercices.filter(
    (e) =>
      e.titre.toLowerCase().includes(search.toLowerCase()) ||
      (e.chapitre || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Mes exercices Maths</h1>
        <Link to="/exercices" className={styles.newBtn} style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
          + Nouvel exercice
        </Link>
      </div>

      {exercices.length > 0 && (
        <input
          className={styles.search}
          placeholder="Rechercher par titre ou chapitre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {loading ? (
        <div className={styles.center}><div className={styles.spinner} /><p>Chargement…</p></div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {exercices.length === 0 ? (
            <>
              <span className={styles.emptyIcon}>📐</span>
              <p>Aucun exercice généré pour l'instant.</p>
              <Link to="/exercices" className={styles.newBtn} style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                Générer mon premier exercice
              </Link>
            </>
          ) : <p>Aucun résultat pour « {search} ».</p>}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((e) => {
            const diffStyle = DIFF_COLORS[e.difficulte] || DIFF_COLORS["Moyen"];
            return (
              <Link key={e.id} to={`/exercices/${e.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span style={{ fontSize: "1.3rem" }}>{e.type === "sujet_complet" ? "📋" : "📐"}</span>
                  <span className={styles.date}>{formatDate(e.created_at)}</span>
                </div>
                <h2 className={styles.cardTitle}>{e.titre}</h2>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {e.chapitre && (
                    <span className={styles.matiere} style={{ background: "#ede9fe", color: "#6d28d9" }}>
                      {e.chapitre}
                    </span>
                  )}
                  <span className={styles.matiere} style={{ background: diffStyle.bg, color: diffStyle.color }}>
                    {e.difficulte}
                  </span>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.count}>
                    {e.type === "sujet_complet" ? "Sujet complet · 3 exercices" : "Exercice ciblé"}
                  </span>
                  <button
                    className={styles.deleteBtn}
                    onClick={(ev) => { ev.preventDefault(); handleDelete(e.id); }}
                    disabled={deleting === e.id}
                  >🗑</button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
