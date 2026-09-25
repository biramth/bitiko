import { Link } from 'react-router-dom'
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'
import { usePageSeo } from '@/hooks/usePageSeo'

// Ce texte est un point de départ raisonnable pour le lancement pilote de
// Bitiko, pas un avis juridique. Une relecture par un juriste (droit
// sénégalais de la protection des données personnelles, encadré par la CDP)
// est recommandée avant un usage à grande échelle.
export function TermsPage() {
  usePageSeo({ title: "Conditions générales d'utilisation — Bitiko" })

  return (
    <LegalLayout title="Conditions générales d'utilisation" updatedAt="25 septembre 2026">
      <LegalSection title="1. Objet">
        <p>
          Bitiko est une plateforme qui permet à un professionnel (« vous », « l'utilisateur ») de créer et gérer
          son propre espace en ligne : catalogue de produits et services, personnalisation de l'apparence, réception
          et suivi de commandes et réservations, encaissement en espèces à la livraison ou en Mobile Money. Les
          présentes conditions générales d'utilisation (« CGU ») régissent l'accès et l'usage de la plateforme par
          un utilisateur professionnel.
        </p>
      </LegalSection>

      <LegalSection title="2. Description du service">
        <p>
          Bitiko fournit l'outil technique (hébergement, interface de gestion, éditeur visuel d'espace, réception
          de commandes et réservations) permettant à l'utilisateur de proposer ses propres produits et services à ses
          propres clients. Bitiko n'est ni vendeur, ni acheteur, ni intermédiaire financier dans les transactions
          conclues entre l'utilisateur et ses clients : la relation commerciale, la livraison, le service après-vente
          et le respect du droit de la consommation applicable relèvent de la seule responsabilité de l'utilisateur.
        </p>
      </LegalSection>

      <LegalSection title="3. Création de compte et d'espace">
        <p>
          La création d'un compte requiert une adresse email valide (ou un compte Google) et la création d'un espace
          associé. L'utilisateur garantit l'exactitude des informations fournies (identité, coordonnées, nom de
          l'activité) et s'engage à les maintenir à jour. Un compte est personnel : l'utilisateur est responsable de
          la confidentialité de son mot de passe et de toute activité effectuée depuis son compte.
        </p>
      </LegalSection>

      <LegalSection title="4. Obligations de l'utilisateur">
        <ul className="list-disc space-y-1 pl-5">
          <li>Décrire ses éléments (produits ou services) de façon exacte et non trompeuse (prix, disponibilité, description, photos).</li>
          <li>Respecter le droit de la consommation applicable à ses ventes et prestations (information précontractuelle, droit de rétractation le cas échéant, garanties légales).</li>
          <li>Traiter les commandes, réservations et livraisons de bonne foi et dans les délais annoncés à ses clients.</li>
          <li>Ne pas utiliser la plateforme pour vendre des produits ou services illégaux, contrefaits ou dangereux.</li>
          <li>Répondre lui-même aux réclamations de ses clients, Bitiko n'étant pas partie à la vente ni à la prestation.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Plans et tarifs">
        <p>
          Bitiko propose un plan gratuit (fonctionnalités et nombre d'éléments actifs limités) et un ou plusieurs plans
          payants offrant des fonctionnalités supplémentaires, dont le détail et les tarifs à jour sont indiqués dans
          l'espace de facturation du compte utilisateur. Les montants sont exprimés en francs CFA (XOF) et peuvent
          évoluer ; tout changement de tarif est communiqué avant son entrée en vigueur pour un abonnement en cours.
          Le paiement des plans payants s'effectue via les moyens de paiement Mobile Money proposés par la plateforme.
        </p>
      </LegalSection>

      <LegalSection title="6. Propriété intellectuelle">
        <p>
          La marque Bitiko, le logiciel de la plateforme et son interface restent la propriété de Bitiko. L'utilisateur
          conserve l'intégralité de ses droits sur son propre contenu (textes, photos d'éléments, nom d'activité, logo)
          et garantit disposer des droits nécessaires pour les publier.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilité et responsabilité">
        <p>
          Bitiko s'efforce d'assurer un accès continu à la plateforme mais ne garantit pas une disponibilité
          ininterrompue (maintenance, incidents techniques indépendants de sa volonté, indisponibilité des
          prestataires tiers listés dans la{' '}
          <Link to="/legal/confidentialite" className="font-medium text-brand-700 hover:underline">
            politique de confidentialité
          </Link>
          ). Bitiko ne saurait être tenu responsable des litiges entre un utilisateur et ses clients, ni des pertes
          d'exploitation résultant d'une indisponibilité temporaire du service.
        </p>
      </LegalSection>

      <LegalSection title="8. Résiliation">
        <p>
          L'utilisateur peut cesser d'utiliser la plateforme à tout moment. Bitiko peut suspendre ou clôturer un
          compte en cas de manquement grave aux présentes CGU (éléments illégaux, fraude, comportement portant
          atteinte à d'autres utilisateurs), après notification lorsque les circonstances le permettent.
        </p>
      </LegalSection>

      <LegalSection title="9. Droit applicable">
        <p>
          Les présentes CGU sont régies par le droit sénégalais. Tout litige relatif à leur interprétation ou leur
          exécution relève des juridictions compétentes du Sénégal, sauf disposition impérative contraire.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>Pour toute question relative aux présentes CGU, contactez-nous à l'adresse indiquée sur la page d'accueil de la plateforme.</p>
      </LegalSection>
    </LegalLayout>
  )
}
