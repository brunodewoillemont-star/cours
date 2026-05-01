import { Routes, Route, NavLink } from "react-router-dom";
import Import from "./pages/Import.jsx";
import MesSyntheses from "./pages/MesSyntheses.jsx";
import Detail from "./pages/Detail.jsx";
import styles from "./App.module.css";

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.logo}>📚 SynthèseCours</span>
          <nav className={styles.nav}>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ""}`
              }
              end
            >
              Importer un cours
            </NavLink>
            <NavLink
              to="/mes-syntheses"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ""}`
              }
            >
              Mes synthèses
            </NavLink>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Import />} />
          <Route path="/mes-syntheses" element={<MesSyntheses />} />
          <Route path="/synthese/:id" element={<Detail />} />
        </Routes>
      </main>

      <footer className={styles.footer}>
        Propulsé par Claude — Anthropic
      </footer>
    </div>
  );
}
