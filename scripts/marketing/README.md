# Visuels marketing (captures + vidéo de démo)

Les images et la vidéo de la landing (`public/marketing/`) sont des **captures de la vraie interface**, prises sur des données
fictives (« Salon Awa Beauté »). Rien n'est dessiné à la main : quand l'interface change, on régénère.

```bash
npm run marketing:serve      # 1er terminal : l'appli sur http://localhost:5199 avec un faux client Supabase
npm run marketing:shots      # 2e terminal : captures → public/marketing/*.webp   (une seule : … -- dashboard)
npm run marketing:video      # 2e terminal : vidéo → public/marketing/demo.mp4 + demo-poster.webp
```

Prérequis : Chromium de Playwright (`npx playwright install chromium`) et `ffmpeg` dans le PATH.

- `mock/supabaseClient.ts` : faux client (jeu de données, écritures en mémoire). Utilisé **uniquement** par `vite.config.ts` de ce dossier.
- `shots.mjs` : liste des écrans (bureau 960×720 @1,5×, mobile 390×844 @2×) ; ajouter une entrée pour une nouvelle capture.
- `video.mjs` : scénario (client sur téléphone → commerçant : tableau de bord, agenda, horaires, prestations, finances), sous-titres et
  curseur injectés, encodage H.264 sans son (~85 s, ~3,5 Mo).
- Les dates sont celles du jour de génération : régénérer avant une refonte de la landing pour éviter des dates périmées.
