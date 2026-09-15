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
    <LegalLayout title="Conditions générales d'utilisation" updatedAt="15 septembre 2026">
      <LegalSection title="1. Objet">
        <p>
          Bitiko est une plateforme qui permet à un commerçant (« vous », « le commerçant ») de créer et gérer sa
          propre boutique en ligne : catalogue de produits, personnalisation de l'apparence, réception et suivi de
          commandes, encaissement en espèces à la livraison ou en Mobile Money. Les présentes conditions générales
          d'utilisation (« CGU ») régissent l'accès et l'usage de la plateforme par un commerçant.
        </p>
      </LegalSection>

      <LegalSection title="2. Description du service">
        <p>
          Bitiko fournit l'outil technique (hébergement, interface de gestion, éditeur visuel de boutique, réception
          de commandes) permettant au commerçant de vendre ses propres produits à ses propres clients. Bitiko n'est
          ni vendeur, ni acheteur, ni intermédiaire financier dans les transactions conclues entre le commerçant et
          ses clients : la relation commerciale, la livraison, le service après-vente et le respect du droit de la
          consommation applicable relèvent de la seule responsabilité du commerçant.
        </p>
      </LegalSection>

      <LegalSection title="3. Création de compte et de boutique">
        <p>
          La création d'un compte requiert une adresse email valide (ou un compte Google) et la création d'une
          boutique associée. Le commerçant garantit l'exactitude des informations fournies (identité, coordonnées,
          nom de la boutique) et s'engage à les maintenir à jour. Un compte est personnel : le commerçant est
          responsable de la confidentialité de son mot de passe et de toute activité effectuée depuis son compte.
        </p>
      </LegalSection>

      <LegalSection title="4. Obligations du commerçant">
        <ul className="list-disc space-y-1 pl-5">
          <li>Décrire ses produits de façon exacte et non trompeuse (prix, disponibilité, description, photos).</li>
          <li>Respecter le droit de la consommation applicable à ses ventes (information précontractuelle, droit de rétractation le cas échéant, garanties légales).</li>
          <li>Traiter les commandes et livraisons de bonne foi et dans les délais annoncés à ses clients.</li>
          <li>Ne pas utiliser la plateforme pour vendre des produits ou services illégaux, contrefaits ou dangereux.</li>
          <li>Répondre lui-même aux réclamations de ses clients, Bitiko n'étant pas partie à la vente.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Plans et tarifs">
        <p>
          Bitiko propose un plan gratuit (fonctionnalités et nombre de produits limités) et un ou plusieurs plans
          payants offrant des fonctionnalités supplémentaires, dont le détail et les tarifs à jour sont indiqués dans
          l'espace de facturation du compte commerçant. Les montants sont exprimés en francs CFA (XOF) et peuvent
          évoluer ; tout changement de tarif est communiqué avant son entrée en vigueur pour un abonnement en cours.
          Le paiement des plans payants s'effectue via les moyens de paiement Mobile Money proposés par la plateforme.
        </p>
      </LegalSection>

      <LegalSection title="6. Propriété intellectuelle">
        <p>
          La marque Bitiko, le logiciel de la plateforme et son interface restent la propriété de Bitiko. Le
          commerçant conserve l'intégralité de ses droits sur son propre contenu (textes, photos de produits, nom de
          boutique, logo) et garantit disposer des droits nécessaires pour les publier.
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
          ). Bitiko ne saurait être tenu responsable des litiges entre un commerçant et ses clients, ni des pertes
          d'exploitation résultant d'une indisponibilité temporaire du service.
        </p>
      </LegalSection>

      <LegalSection title="8. Résiliation">
        <p>
          Le commerçant peut cesser d'utiliser la plateforme à tout moment. Bitiko peut suspendre ou clôturer un
          compte en cas de manquement grave aux présentes CGU (produits illégaux, fraude, comportement portant
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
