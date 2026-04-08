# PonderHub 📖

A **mobile-first**, fully **offline** personal word encyclopedia.  
Add words, write definitions, tag them, and search your own knowledge base — no account, no server, all data stays on your device.

Built with **TypeScript + Vite** and packaged as a native Android APK via **Capacitor**.

---

## Features

- ➕ **Add** words with a term, definition, and optional comma-separated tags
- 📖 **Browse** your Hub — words listed alphabetically
- 🔍 **Search** across terms, definitions, and tags in real time
- ✏️ **Edit** any entry at any time
- 🗑️ **Delete** words you no longer need
- 💾 **100 % local** — data stored in `localStorage` (web) / native storage (Android)
- 🌙 Automatic **dark mode** via `prefers-color-scheme`

---

## Quick start (web)

```bash
npm install
npm run dev          # start dev server at http://localhost:5173
npm run build        # production build → dist/
npm run preview      # preview production build
```

---

## Build an Android APK

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| Android Studio | latest |
| Java (JDK) | 17 |

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Install the Capacitor Android platform (first time only)
npx cap add android

# 3. Build the web app and sync it into the Android project
npm run cap:sync

# 4. Open Android Studio and build the APK from there
npm run cap:android
#    or manually: npx cap open android
```

Inside Android Studio choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

---

## Project structure

```
src/
  main.ts      – entry point
  app.ts       – UI rendering & event handling
  storage.ts   – localStorage CRUD helpers
  types.ts     – shared TypeScript types
  style.css    – mobile-first CSS
capacitor.config.ts  – Capacitor app config
```

---

## Data model

```ts
interface Word {
  id: string;          // unique identifier
  term: string;        // the word / phrase
  definition: string;  // your definition
  tags: string[];      // optional tags for organisation
  createdAt: number;   // Unix ms timestamp
  updatedAt: number;   // Unix ms timestamp
}
```

All words are stored as a JSON array under the `ponderhub_words` key in `localStorage`.
