import "dotenv/config";
import express from "express";
import cors from "cors";
import syntheseRoutes from "./routes/syntheses.js";
import eceRoutes from "./routes/ece.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/syntheses", syntheseRoutes);
app.use("/api/ece", eceRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
