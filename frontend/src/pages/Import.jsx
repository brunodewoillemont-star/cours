import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SyntheseCard from "../components/SyntheseCard.jsx";
import styles from "./Import.module.css";

const TABS = [
  { id: "texte", label: "Coller du texte" },
  { id: "fichier", label: "Importer un fichier (PDF / image)" },
];

export default function Import() {
  const [tab, setTab] = useState("texte");
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [synthese, setSynthese] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef();
  const navigate = useNavigate();

  const reset = () => {
    setSynthese(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSynthese(null);

    if (tab === "texte" && !texte.trim()) {
      setError("Colle le contenu de ton cours ci-dessus.");
      return;
    }
    if (tab === "fichier" && !fichier) {
      setError("Sélectionne un fichier PDF ou une image.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (tab === "texte") {
        formData.append("texte", texte);
      } else {
        formData.append("fichier", fichier);
      }

      const res = await fetch("/api/syntheses/generer", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setSynthese({ id: data.id, ...data.synthese });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setFichier(f); reset(); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFichier(f); reset(); }
  };

  if (synthese) {
    return (
      <div>
        <div className={styles.resultHeader}>
          <button className={styles.backBtn} onClick={() => setSynthese(null)}>
            ← Nouveau cours
          </button>
          <button
            className={styles.saveBtn}
            onClick={() => navigate("/mes-syntheses")}
          >
            Voir mes synthèses
          </button>
        </div>
        <SyntheseCard synthese={synthese} full />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Génère une synthèse de cours</h1>
        <p className={styles.subtitle}>
          Colle ton cours ou importe un fichier — Claude produit un résumé
          structuré en quelques secondes.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
              onClick={() => { setTab(t.id); reset(); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {tab === "texte" ? (
            <textarea
              className={styles.textarea}
              placeholder="Colle ici le texte de ton cours (introduction, définitions, exemples…)"
              value={texte}
              onChange={(e) => { setTexte(e.target.value); reset(); }}
              rows={12}
            />
          ) : (
            <div
              className={`${styles.dropzone} ${fichier ? styles.dropzoneFilled : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/*"
                hidden
                onChange={handleFileChange}
              />
              {fichier ? (
                <div className={styles.fileInfo}>
                  <span className={styles.fileIcon}>
                    {fichier.type === "application/pdf" ? "📄" : "🖼️"}
                  </span>
                  <div>
                    <p className={styles.fileName}>{fichier.name}</p>
                    <p className={styles.fileSize}>
                      {(fichier.size / 1024).toFixed(0)} Ko
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.removeFile}
                    onClick={(e) => { e.stopPropagation(); setFichier(null); }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className={styles.dropzoneContent}>
                  <span className={styles.dropzoneIcon}>📂</span>
                  <p className={styles.dropzoneText}>
                    Glisse ton fichier ici ou <span className={styles.link}>parcourir</span>
                  </p>
                  <p className={styles.dropzoneHint}>PDF ou image (JPG, PNG, WEBP) — max 20 Mo</p>
                </div>
              )}
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Génération en cours…
              </>
            ) : (
              "✨ Générer une synthèse"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
