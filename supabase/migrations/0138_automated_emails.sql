-- 0138_automated_emails.sql
--
-- Personnalisation des emails automatiques depuis /plateforme/campagnes
-- (bienvenue, abonnement activé, rappel de renouvellement). La structure
-- (habillage, titres, encadrés) reste dans le code ; l'objet, le contenu, le
-- bouton et l'interrupteur actif/inactif vivent ici, éditables par l'équipe.
--
--   * `automated_emails` : une ligne par clé d'email. RLS activée sans
--     politique, accès refusé à anon/authenticated : seule la clé service_role
--     y lit/écrit (comme campaigns).
--   * Seeds : le contenu actuel, converti au format éditable (variables
--     {{…}} + **gras**). `on conflict do nothing` : rejoue sans écraser les
--     personnalisations de l'équipe.
--
-- Idempotent, re-jouable.

create table if not exists public.automated_emails (
  key text primary key check (key in ('welcome', 'plan-activated', 'renewal-reminder')),
  subject text not null,
  body text not null,
  button_label text not null default '',
  button_url text not null default '',
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.automated_emails enable row level security;
revoke all on public.automated_emails from anon, authenticated;

insert into public.automated_emails (key, subject, body, button_label, button_url) values
  (
    'welcome',
    $$ {{shop_name}} est en ligne — Bitiko $$,
    $$ Ta boutique est prête à recevoir tes clients. Voici comment démarrer : $$,
    'Ajouter mon premier produit',
    '/admin/produits/nouveau'
  ),
  (
    'plan-activated',
    $$ Bienvenue dans Bitiko {{plan_name}} — {{shop_name}} $$,
    $$ Ton paiement a été vérifié — **{{shop_name}}** est maintenant en {{plan_name}}, actif jusqu'au **{{period_end}}**. $$,
    'Aller sur mon tableau de bord',
    '/admin'
  ),
  (
    'renewal-reminder',
    $$ Ton abonnement expire bientôt — {{shop_name}} $$,
    $$ L'abonnement {{plan_name}} de **{{shop_name}}** arrive à échéance le **{{period_end}}**. Renouvelle-le pour {{amount}} afin de garder tes fonctionnalités {{plan_name}} sans interruption. $$,
    'Renouveler mon abonnement',
    '/admin/parametres/facturation'
  )
on conflict (key) do nothing;
