# PHASE 15 — Performance + Security hardening

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-06 à PHASE-14 (fonctionnellement complètes).

## Objectif

Durcir l'ensemble `Browser → Frontend → API → Auth → DB → Storage → Services externes` :
auth/sessions/cookies/CSRF/XSS/injection, RLS/tenant isolation re-testées (IDOR, IDs devinés),
permissions, uploads (MIME, extension, taille, nommage, isolation, URLs, compression),
rate limits, webhooks/secrets, logs sans données sensibles, erreurs sobres côté client.
Côté perf : budgets (JS/CSS/images/fonts/API/tiers), storefront mesuré sur Android milieu de
gamme 3G/4G instable, waterfalls et re-renders chassés.

## Vérifications préalables

- [ ] Reprendre `0097_security_review.sql`, `0028`/`0034`/`0040`/`0056` (grants), `0029` (storage),
      `0094` (team policies), `middleware.ts`, `vercel.json`, secrets Vercel dev vs prod.

## Étapes

1. Audit sécurité complet + corrections (dont `search_path` des `SECURITY DEFINER` si PHASE-01
   l'a signalé), tests d'intrusion logiques par rôle (owner/staff/platform/visiteur/anonyme).
1bis. Batch issu de PHASE-01 (§3) : ajouter les `WITH CHECK` manquants (5 policies) ; cantonner
   le vendeur au statut (trigger/RPC au lieu d'UPDATE pleine-ligne) ; restreindre la lecture
   publique de `shops` (vue restreinte ou colonnes déplacées — voir PHASE-02 §5.4) et justifier
   ou restreindre `shop_subscriptions: public read` ; remplacer l'UUID brut par un token court
   pour `set_order_customer_email` ; corriger la casse email du self-read commandes ; activer
   leaked-password protection ; revue EXECUTE anon.
2. Re-tests d'isolation tenant sur **toutes** les nouvelles tables (matrices ALLOW/DENY par phase
   rejouées ici en une passe).
3. Budgets perf actés + garde-fous (builder qui avertit : image lourde, animation risquée —
   avertir, pas bloquer), métriques Core Web Vitals suivies sur preview.

## Critères de sortie

- [ ] Aucune faille critique/IDOR connue ; matrices d'isolation toutes vertes, preuves écrites.
- [ ] Budgets documentés et mesurés (storefront + workspace + builder).
- [ ] `PHASE 15 COMPLETE` rédigé.
