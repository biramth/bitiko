# PHASE 23 — Référencement (SEO)

> État : 🟨 EN COURS — 2026-09-26. Travail partagé avec une seconde session (robots.txt, sitemap, aperçus de partage, `usePageSeo`, vitrines) ; ce document décrit la part « pages publiques de la plateforme ».

## Constat

L'application est une SPA : sans exécution du JavaScript, un robot ne voyait qu'un `<div id="root">` vide et les balises génériques d'`index.html`. Une seule page indexable (l'accueil) et deux pages légales, aucun contenu ciblant les recherches par métier (« logiciel de rendez-vous salon de coiffure », « créer une boutique en ligne Sénégal »), un pied de page sans lien vers les CGU ni la confidentialité, et des ancres `#…` cassées hors de l'accueil.

## Livré

- **Prérendu des pages publiques** (`scripts/prerender/`, étape de `npm run build`) : accueil, 6 pages solutions, CGU, confidentialité. Le HTML statique contient tout le contenu, le `<title>`, la description, la canonique et le JSON-LD de chaque page. Les balises sont **capturées depuis les pages elles-mêmes** (stubs de `usePageSeo`, `useJsonLd`, `useFaqStructuredData`) : aucune duplication à maintenir. Servi uniquement sur `bitiko.shop` et `www` par des réécritures conditionnées à l'hôte (`vercel.json`) ; les aperçus Vercel et toutes les vitrines gardent la SPA. Étape non bloquante : en cas d'échec, chaque page reçoit une copie de `index.html`, aucune URL ne tombe en 404. L'application se monte ensuite par-dessus (`createRoot`).
- **6 pages solutions** (`/solutions/:slug`, données dans `src/pages/marketing/solutions/data.ts`) : boutique en ligne, salon de coiffure et beauté, restaurant, mode et artisanat, prestataires de services, finances. Contenu unique par page (h1, bénéfices, fonctionnalités, étapes, FAQ visible), captures réelles, maillage croisé « À lire aussi », fil d'Ariane, données structurées `WebPage`, `FAQPage`, `BreadcrumbList`.
- **Maillage interne** : pied de page commun (`SiteFooter`) avec solutions, produit, CGU et confidentialité ; menu et pied de page corrects hors accueil (`/#tarifs`) ; cartes « Pour chaque métier » de l'accueil liées aux pages solutions.
- **Données structurées** : `SoftwareApplication` mise à jour (commerce + services + finances, `featureList`, `areaServed`), utilitaires `src/seo/jsonLd.ts` testés (échappement de `</script>`).
- **Redirection** `www` → apex (301).

## Seconde session (relue et reprise)

- **Images** (0134, 0135, appliquées sur dev) : vignettes 400 px générées à l'upload (produits, variantes, catégories, logo, bannière), `srcSet` sur les cartes, le hero et la fiche produit, cache d'un an sur les chemins UUID. Les anciennes images retombent sur le fichier complet, sans rattrapage.
- **Partage et robots** : `api/og.ts` sert les aperçus des pages solutions et légales, `robots.txt` interdit les espaces privés, sitemap avec priorités, `llms.txt` étendu, `usePageSeo` corrige l'`og:image` qui survivait à la navigation, Product JSON-LD enrichi (marque, sku, URL).
- **Corrections apportées à la relecture** : retirer le logo ou la bannière laissait leur vignette et l'image restait affichée (les vignettes sont maintenant effacées) ; les pages solutions et légales avaient leurs balises recopiées dans `api/og.ts` et `api/sitemap.ts` (désormais lues à la source : `solutions/data.ts`, `src/seo/legalMeta.ts`) ; l'`og:image` par défaut de la plateforme est restaurée au lieu d'être supprimée ; `lastmod` des produits dans le sitemap ; `Disallow: /api/` ; fiche `LocalBusiness` (nom, logo, téléphone, adresse, réseaux) sur l'accueil de chaque vitrine ; tests des utilitaires d'image.

## À faire côté équipe (hors code)

- Déclarer `https://bitiko.shop/sitemap.xml` dans Google Search Console et Bing Webmaster Tools, vérifier la propriété du domaine, demander l'indexation des 9 pages.
- Vérifier après déploiement (`curl -A Googlebot https://bitiko.shop/solutions/restaurant | head`) que le HTML contient le contenu.
- Mesurer : impressions et requêtes par page solution après 4 à 6 semaines ; ajuster titres et descriptions selon les requêtes réelles.
- Backlinks : profils Instagram/TikTok/annuaires locaux (Sénégal, Côte d'Ivoire) pointant vers les pages solutions.
- Contenu à venir : pages par pays (Sénégal, Côte d'Ivoire, Mali…), guides (créer sa boutique WhatsApp, réduire les no-shows, tenir sa caisse) ; vrais témoignages avec accord écrit (données `Review`).
