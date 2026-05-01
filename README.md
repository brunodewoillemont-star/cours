# SynthèseCours 📚

Application web pour générer des synthèses de cours structurées grâce à Claude (Anthropic).

## Stack

- **Frontend** : React + Vite (port 5173)
- **Backend** : Node.js + Express (port 3001)
- **Base de données** : SQLite (fichier local `backend/syntheses.db`)
- **IA** : Claude Sonnet via l'API Anthropic

## Installation

### 1. Clé API Anthropic

Crée un fichier `backend/.env` à partir de l'exemple :

```bash
cp backend/.env.example backend/.env
```

Puis remplace la valeur `ANTHROPIC_API_KEY` par ta vraie clé disponible sur https://console.anthropic.com

### 2. Installer les dépendances

```bash
# Backend
cd backend && npm install

# Frontend (dans un autre terminal)
cd frontend && npm install
```

### 3. Lancer l'application

**Terminal 1 — backend :**
```bash
cd backend && npm run dev
```

**Terminal 2 — frontend :**
```bash
cd frontend && npm run dev
```

Ouvre http://localhost:5173 dans ton navigateur.

## Fonctionnalités

- **Importer un cours** : colle du texte ou uploade un PDF / une image scannée
- **Générer une synthèse** : titre, matière, idées principales, définitions, plan de révision
- **Mes synthèses** : historique de toutes tes synthèses, recherche, suppression
- **Détail** : vue complète d'une synthèse

## Formats supportés

| Format | Support |
|--------|---------|
| Texte collé | ✅ |
| PDF | ✅ (extraction du texte) |
| Image JPG/PNG | ✅ (vision IA) |
| Image WEBP/GIF | ✅ (vision IA) |
