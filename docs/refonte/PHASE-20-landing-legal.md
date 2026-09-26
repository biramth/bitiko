# PHASE 20 — Landing, CGU et visuels marketing

> État : 🟨 EN COURS — 2026-09-26 (code prêt ; à relire par le produit et un juriste avant mise en ligne).

## Objectif

Présenter Bitiko pour ce qu'il est devenu : une plateforme **commerce ET services** (boutique, rendez-vous, tables, finances), avec des
**captures réelles** de l'interface et une **vidéo de démonstration**, et des textes légaux alignés sur les fonctionnalités livrées.

## Ce qui est livré

**Landing** (`src/pages/marketing/`) : positionnement double (« Vends, réserve et gère ton activité. Un seul outil. »), hero avec captures,
choix commerce / services, vidéo de démo avec chapitres, fonctionnalités regroupées (Vendre / Réserver / Piloter), visite guidée par onglets
(Je vends des produits / Je propose des services / Je pilote mon activité), tarifs calculés depuis `config/plans.ts`, FAQ enrichie.
Les faux témoignages ont été retirés (aucun client réel à citer pour l'instant).

**Visuels** (`public/marketing/`, générés par `scripts/marketing/`, voir son README) : captures de l'application réelle sur données fictives
(boutique « Wax & Style by Fatou », salon « Salon Awa Beauté »), vidéo `demo.mp4` (~2 min 20, sans son, sous-titrée) et affiche.
Les photos produit sont des motifs de tissu générés tant qu'aucune photo n'est déposée dans `scripts/marketing/photos/`.

**CGU / confidentialité** : rendez-vous et réservations, outils de gestion (bilan non légal), notifications, plafonds par plan, renouvellement
manuel de 30 jours, droits des équipiers, accès support tracé, sous-traitants (Resend, Vercel Analytics, HIBP, Google), Bitiko sous-traitant pour
les données des clients finaux des commerçants. Date de mise à jour : 26 septembre 2026.

## À faire / à décider

- Relecture juridique (rôle responsable de traitement / sous-traitant, durées de conservation, remboursement, contact légal).
- Remplacer les motifs de tissu par de vraies photos produit (déposer des JPG dans `scripts/marketing/photos/`, relancer `marketing:shots`).
- Ajouter de vrais témoignages avec accord écrit des commerçants ; mesurer la conversion de la section vidéo.
- Regénérer les visuels après chaque changement d'interface important (dates du jour figées dans les captures).
