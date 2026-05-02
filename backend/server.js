import "dotenv/config";
import express from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import syntheseRoutes from "./routes/syntheses.js";
import eceRoutes from "./routes/ece.js";
import exercicesRoutes from "./routes/exercices.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

app.use(cors({
  origin: isProd ? true : "http://localhost:5173",
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/syntheses", syntheseRoutes);
app.use("/api/ece", eceRoutes);
app.use("/api/exercices", exercicesRoutes);
app.get("/api/health", (req, res) => res.json({ ok: true }));

// En production : sert le frontend React compilé
if (isProd) {
  const distPath = join(__dirname, "../frontend/dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => res.sendFile(join(distPath, "index.html")));
}

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
