import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CorrectionCard from "../components/CorrectionCard.jsx";
import styles from "./Import.module.css";
import eceStyles from "./ECE.module.css";

const TABS = [
  { id: "texte", label: "Coller le sujet" },
  { id: "fichier", label: "Importer (PDF / image)" },
];

export default function ECE() {
  const [tab, setTab] = useState("texte");
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [correction, setCorrection] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef();
  const navigate = useNavigate();

  const reset = () => { setCorrection(null); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCorrection(null);

    if (tab === "texte" && !texte.trim()) {
      setError("Colle le sujet de ton ECE ci-dessus.");
      return;
    }
    if (tab === "fichier" && !fichier) {
      setError("Sélectionne un fichier PDF ou une image.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (tab === "texte") formData.append("texte", texte);
      else formData.append("fichier", fichier);

      const res = await fetch("/api/ece/corriger", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setCorrection({ id: data.id, ...data.correction });
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

  if (correction) {
    return (
      <div>
        <div className={styles.resultHeader}>
          <button className={styles.backBtn} onClick={() => setCorrection(null)}>
            ← Nouveau sujet
          </button>
          <button className={styles.saveBtn} onClick={() => navigate("/mes-ece")}>
            Voir mes corrections
          </button>
        </div>
        <CorrectionCard correction={correction} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={eceStyles.badge}>ECE Bac</div>
        <h1 className={styles.title}>Corriger un sujet d'ECE</h1>
        <p className={styles.subtitle}>
          Colle ton sujet d'ECE — obtiens une correction complète avec méthode
          de manipulation et astuces pratiques.
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
              placeholder="Colle ici le sujet complet de ton ECE (questions, documents, protocole…)"
              value={texte}
              onChange={(e) => { setTexte(e.target.value); reset(); }}
              rows={14}
            />
          ) : (
            <div
              className={`${styles.dropzone} ${fichier ? styles.dropzoneFilled : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf,image/*" hidden onChange={handleFileChange} />
              {fichier ? (
                <div className={styles.fileInfo}>
                  <span className={styles.fileIcon}>{fichier.type === "application/pdf" ? "📄" : "🖼️"}</span>
                  <div>
                    <p className={styles.fileName}>{fichier.name}</p>
                    <p className={styles.fileSize}>{(fichier.size / 1024).toFixed(0)} Ko</p>
                  </div>
                  <button type="button" className={styles.removeFile} onClick={(e) => { e.stopPropagation(); setFichier(null); }}>✕</button>
                </div>
              ) : (
                <div className={styles.dropzoneContent}>
                  <span className={styles.dropzoneIcon}>📂</span>
                  <p className={styles.dropzoneText}>Glisse ton fichier ici ou <span className={styles.link}>parcourir</span></p>
                  <p className={styles.dropzoneHint}>PDF ou image — max 20 Mo</p>
                </div>
              )}
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={`${styles.submitBtn} ${eceStyles.submitBtn}`} disabled={loading}>
            {loading ? (
              <><span className={styles.spinner} /> Correction en cours…</>
            ) : (
              "🔬 Corriger l'ECE"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
