import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./MesSyntheses.module.css";

const TYPE_ICONS = { pdf: "📄", image: "🖼️", texte: "📝" };

function formatDate(str) {
  const d = new Date(str.endsWith("Z") ? str : str + "Z");
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

export default function MesSyntheses() {
  const [syntheses, setSyntheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetch("/api/syntheses")
      .then((r) => r.json())
      .then((data) => setSyntheses(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette synthèse ?")) return;
    setDeleting(id);
    await fetch(`/api/syntheses/${id}`, { method: "DELETE" });
    setSyntheses((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  };

  const filtered = syntheses.filter(
    (s) =>
      s.titre.toLowerCase().includes(search.toLowerCase()) ||
      (s.synthese?.matiere || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Mes synthèses</h1>
        <Link to="/" className={styles.newBtn}>
          + Nouveau cours
        </Link>
      </div>

      {syntheses.length > 0 && (
        <input
          className={styles.search}
          placeholder="Rechercher par titre ou matière…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {loading ? (
        <div className={styles.center}>
          <div className={styles.spinner} />
          <p>Chargement…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {syntheses.length === 0 ? (
            <>
              <span className={styles.emptyIcon}>📭</span>
              <p>Aucune synthèse pour l'instant.</p>
              <Link to="/" className={styles.newBtn}>
                Générer ma première synthèse
              </Link>
            </>
          ) : (
            <p>Aucun résultat pour « {search} ».</p>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((s) => (
            <Link key={s.id} to={`/synthese/${s.id}`} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.typeIcon}>
                  {TYPE_ICONS[s.type_source] || "📝"}
                </span>
                <span className={styles.date}>{formatDate(s.created_at)}</span>
              </div>
              <h2 className={styles.cardTitle}>{s.titre}</h2>
              {s.synthese?.matiere && (
                <span className={styles.matiere}>{s.synthese.matiere}</span>
              )}
              {s.nom_fichier && (
                <p className={styles.fichier}>{s.nom_fichier}</p>
              )}
              <p className={styles.preview}>
                {s.synthese?.resume_court?.slice(0, 120)}…
              </p>
              <div className={styles.cardFooter}>
                <span className={styles.count}>
                  {s.synthese?.idees_principales?.length || 0} idées ·{" "}
                  {s.synthese?.definitions?.length || 0} définitions
                </span>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(s.id);
                  }}
                  disabled={deleting === s.id}
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
