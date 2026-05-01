import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./MesSyntheses.module.css";

function formatDate(str) {
  const d = new Date(str.endsWith("Z") ? str : str + "Z");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const TYPE_ICONS = { pdf: "📄", image: "🖼️", texte: "📝" };

export default function MesECE() {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetch("/api/ece")
      .then((r) => r.json())
      .then(setCorrections)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette correction ?")) return;
    setDeleting(id);
    await fetch(`/api/ece/${id}`, { method: "DELETE" });
    setCorrections((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
  };

  const filtered = corrections.filter(
    (c) =>
      c.titre.toLowerCase().includes(search.toLowerCase()) ||
      (c.matiere || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Mes corrections ECE</h1>
        <Link to="/ece" className={styles.newBtn} style={{ background: "#059669" }}>
          + Nouveau sujet
        </Link>
      </div>

      {corrections.length > 0 && (
        <input
          className={styles.search}
          placeholder="Rechercher par titre ou matière…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {loading ? (
        <div className={styles.center}><div className={styles.spinner} /><p>Chargement…</p></div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {corrections.length === 0 ? (
            <>
              <span className={styles.emptyIcon}>🔬</span>
              <p>Aucune correction ECE pour l'instant.</p>
              <Link to="/ece" className={styles.newBtn} style={{ background: "#059669" }}>
                Corriger mon premier ECE
              </Link>
            </>
          ) : (
            <p>Aucun résultat pour « {search} ».</p>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((c) => (
            <Link key={c.id} to={`/ece/${c.id}`} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.typeIcon}>{TYPE_ICONS[c.type_source] || "📝"}</span>
                <span className={styles.date}>{formatDate(c.created_at)}</span>
              </div>
              <h2 className={styles.cardTitle}>{c.titre}</h2>
              {c.matiere && (
                <span className={styles.matiere} style={{ background: "#d1fae5", color: "#059669" }}>
                  {c.matiere}
                </span>
              )}
              {c.nom_fichier && <p className={styles.fichier}>{c.nom_fichier}</p>}
              <p className={styles.preview}>{c.correction?.contexte?.slice(0, 120)}…</p>
              <div className={styles.cardFooter}>
                <span className={styles.count}>
                  {c.correction?.correction_questions?.length || 0} questions ·{" "}
                  {c.correction?.manipulation?.astuces?.length || 0} astuces
                </span>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => { e.preventDefault(); handleDelete(c.id); }}
                  disabled={deleting === c.id}
                >
                  🗑
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
