import { Routes, Route, NavLink } from "react-router-dom";
import Import from "./pages/Import.jsx";
import MesSyntheses from "./pages/MesSyntheses.jsx";
import Detail from "./pages/Detail.jsx";
import ECE from "./pages/ECE.jsx";
import MesECE from "./pages/MesECE.jsx";
import DetailECE from "./pages/DetailECE.jsx";
import styles from "./App.module.css";

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.logo}>📚 SynthèseCours</span>
          <nav className={styles.nav}>
            <NavLink to="/" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ""}`} end>
              Synthèse de cours
            </NavLink>
            <NavLink to="/mes-syntheses" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ""}`}>
              Mes synthèses
            </NavLink>
            <NavLink to="/ece" className={({ isActive }) => `${styles.navLink} ${styles.navEce} ${isActive ? styles.activeEce : ""}`} end>
              🔬 ECE Bac
            </NavLink>
            <NavLink to="/mes-ece" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ""}`}>
              Mes corrections
            </NavLink>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Import />} />
          <Route path="/mes-syntheses" element={<MesSyntheses />} />
          <Route path="/synthese/:id" element={<Detail />} />
          <Route path="/ece" element={<ECE />} />
          <Route path="/mes-ece" element={<MesECE />} />
          <Route path="/ece/:id" element={<DetailECE />} />
        </Routes>
      </main>

      <footer className={styles.footer}>
        Propulsé par Groq (Llama) — Gratuit
      </footer>
    </div>
  );
}
