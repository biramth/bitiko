import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'
import { usePageSeo } from '@/hooks/usePageSeo'

// Ce texte est un point de départ raisonnable pour le lancement pilote de
// Bitiko, pas un avis juridique. Une relecture par un juriste (droit
// sénégalais de la protection des données personnelles, encadré par la CDP)
// est recommandée avant un usage à grande échelle.
export function PrivacyPage() {
  usePageSeo({ title: 'Politique de confidentialité — Bitiko' })

  return (
    <LegalLayout title="Politique de confidentialité" updatedAt="25 septembre 2026">
      <LegalSection title="1. Qui traite vos données">
        <p>
          Bitiko est responsable du traitement des données décrites ci-dessous, à la fois pour les utilisateurs
          professionnels qui créent un espace sur la plateforme et pour les clients finaux qui passent commande ou
          réservent sur un espace hébergé par Bitiko.
        </p>
      </LegalSection>

      <LegalSection title="2. Données collectées">
        <p><strong>Compte utilisateur :</strong> adresse email, mot de passe (jamais stocké en clair), nom de l'activité, coordonnées de contact, numéro WhatsApp, informations de paiement Mobile Money éventuellement renseignées pour ses propres clients.</p>
        <p><strong>Client final (au moment d'une commande ou réservation) :</strong> nom, numéro de téléphone, adresse de livraison. Ces informations sont saisies directement par le client sur l'espace de l'utilisateur et lui sont destinées ; Bitiko les héberge pour le compte de l'utilisateur.</p>
        <p><strong>Données techniques :</strong> pages visitées et statistiques de fréquentation agrégées (voir « Cookies et mesure d'audience » ci-dessous).</p>
      </LegalSection>

      <LegalSection title="3. Finalités">
        <ul className="list-disc space-y-1 pl-5">
          <li>Faire fonctionner le compte utilisateur et son espace (authentification, sauvegarde du catalogue et des réglages).</li>
          <li>Permettre au client final de passer une commande ou réserver et à l'utilisateur de la traiter (nom, téléphone, adresse transmis à l'utilisateur pour la livraison ou la prestation).</li>
          <li>Facturer les plans payants et prévenir la fraude.</li>
          <li>Mesurer la fréquentation des espaces pour améliorer la plateforme.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Base légale">
        <p>
          Le traitement repose sur l'exécution du contrat conclu avec l'utilisateur (CGU) pour la gestion du compte
          et de l'espace, sur l'exécution de la commande ou réservation pour les données du client final, et sur l'intérêt
          légitime de Bitiko pour la mesure d'audience et la sécurité de la plateforme.
        </p>
      </LegalSection>

      <LegalSection title="5. Sous-traitants et hébergement">
        <p>Les données sont hébergées et traitées par les prestataires suivants, chacun soumis à ses propres engagements de sécurité :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Supabase</strong> — base de données, authentification et stockage des fichiers (photos d'espace et d'éléments).</li>
          <li><strong>Vercel</strong> — hébergement de l'application.</li>
          <li><strong>Wave</strong> — traitement des paiements Mobile Money pour les abonnements payants.</li>
          <li><strong>Google Analytics</strong> — statistiques de fréquentation des espaces (données de navigation, pas les données personnelles saisies à la commande).</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Durée de conservation">
        <p>
          Les données du compte utilisateur sont conservées tant que le compte est actif, puis supprimées ou
          anonymisées dans un délai raisonnable après sa clôture, sauf obligation légale de conservation plus longue
          (comptabilité, litige en cours). Les données d'une commande ou réservation sont conservées le temps nécessaire à son
          traitement et à la gestion d'éventuels litiges ou obligations comptables.
        </p>
      </LegalSection>

      <LegalSection title="7. Vos droits">
        <p>
          Toute personne (utilisateur ou client final) dispose d'un droit d'accès, de rectification et de suppression
          de ses données personnelles. Pour l'exercer, contactez Bitiko à l'adresse indiquée sur la page d'accueil de
          la plateforme ; pour une donnée saisie chez un utilisateur précis (ex. une commande), le client peut aussi
          s'adresser directement à cet utilisateur.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies et mesure d'audience">
        <p>
          Les espaces hébergés sur Bitiko utilisent un cookie technique pour le panier d'achat (nécessaire au
          fonctionnement du service, pas de consentement requis) et, lorsque la mesure d'audience est activée, des
          cookies Google Analytics permettant de compter les visites de façon agrégée.
        </p>
      </LegalSection>

      <LegalSection title="9. Sécurité">
        <p>
          L'accès aux données de chaque espace est restreint à son propriétaire par des règles de sécurité
          appliquées au niveau de la base de données (chaque utilisateur ne peut lire ou modifier que ses propres
          données) ; les commandes et réservations sont créées via une fonction serveur qui revalide systématiquement les
          prix, stocks et créneaux avant tout enregistrement.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>Pour toute question relative à cette politique ou à l'exercice de vos droits, contactez-nous à l'adresse indiquée sur la page d'accueil de la plateforme.</p>
      </LegalSection>
    </LegalLayout>
  )
}
