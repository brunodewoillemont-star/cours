import { Routes, Route, NavLink } from "react-router-dom";
import Import from "./pages/Import.jsx";
import MesSyntheses from "./pages/MesSyntheses.jsx";
import Detail from "./pages/Detail.jsx";
import ECE from "./pages/ECE.jsx";
import MesECE from "./pages/MesECE.jsx";
import DetailECE from "./pages/DetailECE.jsx";
import Exercices from "./pages/Exercices.jsx";
import MesExercices from "./pages/MesExercices.jsx";
import DetailExercice from "./pages/DetailExercice.jsx";
import styles from "./App.module.css";

const nav = (base, active) => `${styles.navLink} ${base} ${active ? styles[base.split(" ")[1] || "active"] : ""}`;

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.logo}>📚 SynthèseCours</span>
          <nav className={styles.nav}>
            <NavLink to="/" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ""}`} end>
              Cours
            </NavLink>
            <NavLink to="/mes-syntheses" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ""}`}>
              Mes synthèses
            </NavLink>
            <NavLink to="/ece" className={({ isActive }) => `${styles.navLink} ${styles.navEce} ${isActive ? styles.activeEce : ""}`} end>
              🔬 ECE
            </NavLink>
            <NavLink to="/mes-ece" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ""}`}>
              Corrections ECE
            </NavLink>
            <NavLink to="/exercices" className={({ isActive }) => `${styles.navLink} ${styles.navMath} ${isActive ? styles.activeMath : ""}`} end>
              📐 Maths Bac
            </NavLink>
            <NavLink to="/mes-exercices" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ""}`}>
              Mes exercices
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
          <Route path="/exercices" element={<Exercices />} />
          <Route path="/mes-exercices" element={<MesExercices />} />
          <Route path="/exercices/:id" element={<DetailExercice />} />
        </Routes>
      </main>

      <footer className={styles.footer}>
        Propulsé par Groq (Llama) — Gratuit
      </footer>
    </div>
  );
}
