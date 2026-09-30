import { Link } from 'react-router-dom'
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'
import { CONTACT_EMAIL } from '@/config/contact'
import { usePageSeo } from '@/hooks/usePageSeo'
import { LEGAL_META } from '@/seo/legalMeta'

// Ce texte est un point de départ raisonnable pour le lancement pilote de
// Bitiko, pas un avis juridique. Une relecture par un juriste (droit
// sénégalais de la protection des données personnelles, encadré par la CDP)
// est recommandée avant un usage à grande échelle.
export function PrivacyPage() {
  usePageSeo(LEGAL_META['legal/confidentialite'])

  return (
    <LegalLayout title="Politique de confidentialité" updatedAt="30 septembre 2026">
      <LegalSection title="1. Qui traite vos données">
        <p>
          Bitiko est responsable du traitement des données des utilisateurs professionnels qui créent un espace sur la
          plateforme (compte, facturation, sécurité, mesure d'audience).
        </p>
        <p>
          Pour les données des clients finaux de ces utilisateurs (commande, rendez-vous, réservation), c'est
          l'utilisateur professionnel qui décide de leur usage et en est responsable ; Bitiko les héberge et les traite
          pour son compte, uniquement pour faire fonctionner son espace. Il en va de même pour les données que
          l'utilisateur saisit lui-même (équipe, journal de recettes et dépenses).
        </p>
      </LegalSection>

      <LegalSection title="2. Données collectées">
        <p><strong>Compte utilisateur :</strong> adresse email (ou identité du compte Google utilisé pour se connecter), mot de passe (jamais stocké en clair), nom de l'activité, pays, coordonnées de contact, numéro WhatsApp, informations de paiement Mobile Money éventuellement renseignées pour ses propres clients.</p>
        <p><strong>Client final (au moment d'une commande, d'un rendez-vous ou d'une réservation) :</strong> nom, numéro de téléphone, adresse de livraison le cas échéant, prestation ou table demandée, date et heure choisies, nombre de couverts, note éventuelle. Ces informations sont saisies directement par le client sur l'espace de l'utilisateur et lui sont destinées.</p>
        <p><strong>Équipe :</strong> nom, fonction, spécialité et coordonnées de contact des membres d'équipe présentés par l'utilisateur, et adresse email des collaborateurs invités à gérer l'espace.</p>
        <p><strong>Gestion financière :</strong> libellés, montants, catégories, dates et moyens de paiement des recettes et dépenses saisies par l'utilisateur dans son journal, ainsi que les chiffres calculés à partir de ses commandes et rendez-vous. Ces données ne sont visibles que du propriétaire et des managers de l'espace. Les exports (CSV, PDF) sont générés dans le navigateur de l'utilisateur et ne sont pas transmis à Bitiko.</p>
        <p><strong>Données techniques :</strong> pages visitées et statistiques de fréquentation agrégées, journaux de sécurité, et enregistrement des accès du personnel de support (voir « Cookies et mesure d'audience » et « Sécurité » ci-dessous).</p>
      </LegalSection>

      <LegalSection title="3. Finalités">
        <ul className="list-disc space-y-1 pl-5">
          <li>Faire fonctionner le compte utilisateur et son espace (authentification, sauvegarde du catalogue, de l'agenda et des réglages).</li>
          <li>Permettre au client final de passer une commande, de demander un rendez-vous ou de réserver une table, et à l'utilisateur de la traiter (nom, téléphone, adresse transmis à l'utilisateur pour la livraison ou la prestation).</li>
          <li>Envoyer les emails de service à l'utilisateur : alerte à chaque nouvelle demande, rappels d'échéance de l'abonnement, informations sur le compte.</li>
          <li>Envoyer les nouveautés et offres de Bitiko, uniquement aux utilisateurs qui l'ont accepté (case non cochée par défaut à l'inscription, modifiable à tout moment dans « Mon compte » ou par le lien de désinscription de chaque email).</li>
          <li>Permettre à l'utilisateur de suivre ses recettes et dépenses et d'éditer un bilan de gestion.</li>
          <li>Facturer les plans payants et prévenir la fraude.</li>
          <li>Mesurer la fréquentation des espaces pour améliorer la plateforme.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Base légale">
        <p>
          Le traitement repose sur l'exécution du contrat conclu avec l'utilisateur (CGU) pour la gestion du compte
          et de l'espace, sur l'exécution de la commande, du rendez-vous ou de la réservation pour les données du client
          final, sur votre consentement pour les traceurs tiers et les emails de nouveautés et offres, et sur l'intérêt légitime pour la mesure
          d'audience interne exemptée (voir la <Link to="/legal/cookies" className="font-medium text-brand-700 hover:underline">politique cookies</Link>),
          et sur l'intérêt légitime de Bitiko pour la prévention de la fraude et la sécurité
          de la plateforme.
        </p>
      </LegalSection>

      <LegalSection title="5. Sous-traitants et hébergement">
        <p>Les données sont hébergées et traitées par les prestataires suivants, chacun soumis à ses propres engagements de sécurité :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Supabase</strong> — base de données, authentification et stockage des fichiers (photos d'espace et d'éléments).</li>
          <li><strong>Vercel</strong> — hébergement de l'application, mesure de fréquentation et de performance (Vercel Analytics et Speed Insights, chargés uniquement après votre consentement).</li>
          <li><strong>Resend</strong> — envoi des emails de service (alertes de nouvelle demande, rappels d'échéance).</li>
          <li><strong>Wave</strong> — traitement des paiements Mobile Money pour les abonnements payants.</li>
          <li><strong>Google</strong> — connexion avec un compte Google, uniquement si l'utilisateur la choisit (données d'identification, pas de mesure d'audience : Bitiko n'utilise plus Google Analytics).</li>
          <li><strong>Have I Been Pwned</strong> — vérification, au moment du choix d'un mot de passe, qu'il n'a pas déjà fuité : seuls les cinq premiers caractères d'une empreinte du mot de passe sont envoyés, jamais le mot de passe lui-même.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Durée de conservation">
        <p>
          Les données du compte utilisateur sont conservées tant que le compte est actif, puis supprimées ou
          anonymisées dans un délai raisonnable après sa clôture, sauf obligation légale de conservation plus longue
          (comptabilité, litige en cours). Les données d'une commande, d'un rendez-vous ou d'une réservation sont conservées le temps nécessaire à
          leur traitement et à la gestion d'éventuels litiges ou obligations comptables. Le retour d'un compte au plan
          gratuit, faute de renouvellement, ne supprime pas ses données.
        </p>
        <p>
          Un compte dont l'adresse email n'a jamais été confirmée et qui n'a créé aucun espace est supprimé au bout de
          7 jours. Le journal des accès du personnel de support et l'historique des campagnes d'emails sont conservés
          3 ans. Les abonnements aux notifications d'un appareil resté inactif sont supprimés au bout de 13 mois.
        </p>
      </LegalSection>

      <LegalSection title="7. Vos droits">
        <p>
          Toute personne (utilisateur ou client final) dispose d'un droit d'accès, de rectification et de suppression
          de ses données personnelles. Pour l'exercer, écrivez à Bitiko à <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-700 hover:underline">{CONTACT_EMAIL}</a> ; pour une donnée saisie chez un utilisateur précis (ex. une commande ou un rendez-vous), le client
          peut aussi s'adresser directement à cet utilisateur, qui en est responsable.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies et mesure d'audience">
        <p>
          Les espaces hébergés sur Bitiko utilisent le stockage local du navigateur pour le panier d'achat
          (nécessaire au fonctionnement du service, pas de consentement requis). La fréquentation des pages
          est mesurée par un outil interne exempté de consentement (page consultée sans ses paramètres
          d'adresse, boutique visitée, hôte du site de provenance, identifiant de visite aléatoire cloisonné
          par boutique et limité à 6 mois, jamais lié à un compte, données supprimées à 13 mois), auquel vous
          pouvez vous opposer à tout moment.
        </p>
        <p>
          Aucun outil tiers (Vercel Analytics et Speed Insights, PostHog hébergé dans l'Union européenne) ne
          se charge avant votre choix via la bannière « Tout accepter / Tout refuser », valable 6 mois et
          retirable à tout moment. Le détail, outil par outil, figure dans notre{' '}
          <Link to="/legal/cookies" className="font-medium text-brand-700 hover:underline">politique cookies</Link>.
        </p>
      </LegalSection>

      <LegalSection title="9. Sécurité">
        <p>
          L'accès aux données de chaque espace est restreint à son propriétaire et aux collaborateurs qu'il a invités,
          selon leur rôle, par des règles de sécurité appliquées au niveau de la base de données ; les finances ne sont
          lisibles que du propriétaire et des managers. Les commandes, rendez-vous et réservations sont créés via une fonction
          serveur qui revalide systématiquement les prix, stocks, horaires et créneaux avant tout enregistrement, et
          limite les demandes abusives. Le personnel de support de Bitiko n'accède aux données d'un espace que pour
          aider l'utilisateur, et chaque accès est enregistré.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>Pour toute question relative à cette politique ou à l'exercice de vos droits, écrivez-nous à <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-700 hover:underline">{CONTACT_EMAIL}</a>.</p>
      </LegalSection>
    </LegalLayout>
  )
}
