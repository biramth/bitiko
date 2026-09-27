-- Facturation a quitté /admin/parametres/facturation pour devenir le bouton
-- « Changer d'abonnement » (pop-up) dans Mon compte. Le lien du bouton de
-- l'email « renewal-reminder », inséré par 0138 et personnalisable depuis
-- /plateforme/campagnes, pointait vers l'ancienne page : on le corrige.
-- Filtré sur l'ancienne valeur exacte pour ne jamais écraser une
-- personnalisation faite par l'équipe plateforme entre-temps.
-- Idempotent, re-jouable.

update public.automated_emails
set button_url = '/admin/parametres/compte?billing=1'
where key = 'renewal-reminder'
  and button_url = '/admin/parametres/facturation';
