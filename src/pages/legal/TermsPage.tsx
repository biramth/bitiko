import { Link } from 'react-router-dom'
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'
import { PLANS } from '@/config/plans'
import { usePageSeo } from '@/hooks/usePageSeo'

// Ce texte est un point de départ raisonnable pour le lancement pilote de
// Bitiko, pas un avis juridique. Une relecture par un juriste (droit
// sénégalais de la protection des données personnelles, encadré par la CDP)
// est recommandée avant un usage à grande échelle.
export function TermsPage() {
  usePageSeo({ title: "Conditions générales d'utilisation — Bitiko" })

  return (
    <LegalLayout title="Conditions générales d'utilisation" updatedAt="26 septembre 2026">
      <LegalSection title="1. Objet">
        <p>
          Bitiko est une plateforme qui permet à un professionnel (« vous », « l'utilisateur ») de créer et gérer
          son propre espace en ligne : catalogue de produits et de prestations de service, personnalisation de
          l'apparence, réception et suivi de commandes, de demandes de rendez-vous et de réservations de tables,
          gestion de son équipe, suivi de ses recettes et dépenses, encaissement en espèces ou en Mobile Money. Les
          présentes conditions générales d'utilisation (« CGU ») régissent l'accès et l'usage de la plateforme par
          un utilisateur professionnel.
        </p>
      </LegalSection>

      <LegalSection title="2. Description du service">
        <p>
          Bitiko fournit l'outil technique (hébergement, interface de gestion, éditeur visuel d'espace, réception
          de commandes, de demandes de rendez-vous et de réservations, outils de gestion) permettant à l'utilisateur
          de proposer ses propres produits et services à ses propres clients. Bitiko n'est ni vendeur, ni acheteur,
          ni intermédiaire financier dans les transactions conclues entre l'utilisateur et ses clients : la relation
          commerciale, la livraison, l'exécution de la prestation, le service après-vente et le respect du droit de la
          consommation applicable relèvent de la seule responsabilité de l'utilisateur.
        </p>
        <p>
          Une demande de rendez-vous ou de réservation de table faite par un client sur l'espace de l'utilisateur est
          une demande adressée à celui-ci : il la confirme ou la refuse, informe son client par le moyen de son choix
          (téléphone, WhatsApp…) et reste seul responsable du respect de l'horaire annoncé. Bitiko propose uniquement
          les créneaux qui découlent des horaires, congés et capacités que l'utilisateur a lui-même réglés, et
          l'utilisateur est responsable de l'exactitude de ces réglages.
        </p>
      </LegalSection>

      <LegalSection title="3. Création de compte et d'espace">
        <p>
          La création d'un compte requiert une adresse email valide (ou un compte Google) et la création d'un espace
          associé. L'utilisateur garantit l'exactitude des informations fournies (identité, coordonnées, nom de
          l'activité, pays d'exercice) et s'engage à les maintenir à jour. Un compte est personnel : l'utilisateur est
          responsable de la confidentialité de son mot de passe et de toute activité effectuée depuis son compte.
        </p>
        <p>
          L'utilisateur peut inviter des collaborateurs (par exemple un manager ou un vendeur) à accéder à son espace
          avec des droits limités. Il reste responsable des accès qu'il accorde et des actions réalisées par ses
          collaborateurs, et peut les retirer à tout moment.
        </p>
      </LegalSection>

      <LegalSection title="4. Obligations de l'utilisateur">
        <ul className="list-disc space-y-1 pl-5">
          <li>Décrire ses éléments (produits ou prestations) de façon exacte et non trompeuse (prix, durée, disponibilité, description, photos).</li>
          <li>Respecter le droit de la consommation applicable à ses ventes et prestations (information précontractuelle, droit de rétractation le cas échéant, garanties légales) ainsi que la réglementation du pays où il exerce.</li>
          <li>Traiter les commandes, rendez-vous, réservations et livraisons de bonne foi et dans les délais annoncés à ses clients, et prévenir ses clients en cas d'empêchement.</li>
          <li>Ne pas utiliser la plateforme pour vendre des produits ou services illégaux, contrefaits ou dangereux.</li>
          <li>Répondre lui-même aux réclamations de ses clients, Bitiko n'étant pas partie à la vente ni à la prestation.</li>
          <li>Utiliser de manière loyale les coordonnées de ses clients (nom, téléphone) : uniquement pour traiter leur commande, leur rendez-vous ou leur réservation, ou pour les finalités qu'ils ont acceptées.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Outils de gestion et bilan financier">
        <p>
          Bitiko met à disposition un journal de recettes et de dépenses et un bilan simple (recettes, dépenses,
          bénéfice, évolution mois par mois). Les recettes issues des commandes payées ou livrées et des rendez-vous
          terminés sont reprises automatiquement ; les autres recettes et toutes les dépenses sont saisies par
          l'utilisateur. Ces documents sont des <strong>outils de pilotage de l'activité</strong> : ils ne constituent
          ni une comptabilité légale, ni une déclaration fiscale ou sociale, ni un conseil comptable ou fiscal. Leur
          exactitude dépend des informations enregistrées, et l'utilisateur reste seul responsable de ses obligations
          comptables, fiscales et sociales.
        </p>
        <p>
          Le bilan peut être téléchargé au format tableur (CSV) ou imprimé en PDF depuis le navigateur de l'utilisateur.
          Les finances d'un espace ne sont accessibles qu'à son propriétaire et à ses managers.
        </p>
      </LegalSection>

      <LegalSection title="6. Notifications">
        <p>
          Bitiko envoie à l'utilisateur les messages nécessaires au service, notamment par email : alerte à la
          réception d'une nouvelle demande de rendez-vous ou de réservation, rappels d'échéance de l'abonnement,
          informations relatives au compte. Les commandes peuvent en outre être relayées vers le numéro WhatsApp
          renseigné par l'utilisateur. Les messages que l'utilisateur adresse ensuite à ses propres clients
          (confirmation, refus, rappel) relèvent de sa seule responsabilité.
        </p>
      </LegalSection>

      <LegalSection title="7. Plans, tarifs et paiement">
        <p>
          Bitiko propose un plan gratuit et des plans payants (Essentiel, Pro) offrant des fonctionnalités et des
          plafonds plus élevés. Chaque plan fixe notamment un nombre maximal de produits et de prestations actifs, de
          membres d'équipe affichés, de demandes de rendez-vous ou de réservation reçues par mois, de saisies mensuelles
          dans le journal financier et la profondeur d'historique du bilan. À la date de ces CGU, le plan Essentiel est
          facturé{' '}
          {PLANS.essential.priceXof.toLocaleString('fr-FR')} F CFA et le plan Pro{' '}
          {PLANS.pro.priceXof.toLocaleString('fr-FR')} F CFA par mois. Le détail à jour des plans, de leurs limites et
          de leurs tarifs est indiqué dans l'espace de facturation du compte et sur la page d'accueil de la plateforme.
        </p>
        <p>
          Les montants sont exprimés en francs CFA (XOF) et peuvent évoluer ; tout changement de tarif est communiqué
          avant son entrée en vigueur pour un abonnement en cours. Le paiement s'effectue via les moyens Mobile Money
          proposés par la plateforme. Chaque paiement valide ouvre une période d'abonnement de 30 jours ;{' '}
          <strong>l'abonnement n'est pas renouvelé automatiquement</strong> et aucun prélèvement n'est effectué sans
          action de l'utilisateur. À l'échéance sans nouveau paiement, le compte revient au plan gratuit et ses
          limites s'appliquent de nouveau ; les données de l'utilisateur ne sont pas supprimées pour autant.
        </p>
      </LegalSection>

      <LegalSection title="8. Données et confidentialité">
        <p>
          Les données de l'espace de l'utilisateur (catalogue, commandes, rendez-vous, équipe, finances) lui
          appartiennent. Pour les données de ses propres clients, l'utilisateur détermine les finalités et les moyens
          du traitement ; Bitiko les héberge et les traite pour son compte, selon les modalités décrites dans la{' '}
          <Link to="/legal/confidentialite" className="font-medium text-brand-700 hover:underline">
            politique de confidentialité
          </Link>
          . Le personnel de support de Bitiko n'accède aux données d'un espace que pour aider l'utilisateur, et chaque
          accès est enregistré.
        </p>
      </LegalSection>

      <LegalSection title="9. Propriété intellectuelle">
        <p>
          La marque Bitiko, le logiciel de la plateforme et son interface restent la propriété de Bitiko. L'utilisateur
          conserve l'intégralité de ses droits sur son propre contenu (textes, photos d'éléments, nom d'activité, logo)
          et garantit disposer des droits nécessaires pour les publier.
        </p>
      </LegalSection>

      <LegalSection title="10. Disponibilité et responsabilité">
        <p>
          Bitiko s'efforce d'assurer un accès continu à la plateforme mais ne garantit pas une disponibilité
          ininterrompue (maintenance, incidents techniques indépendants de sa volonté, indisponibilité des
          prestataires tiers listés dans la{' '}
          <Link to="/legal/confidentialite" className="font-medium text-brand-700 hover:underline">
            politique de confidentialité
          </Link>
          ). Bitiko ne saurait être tenu responsable des litiges entre un utilisateur et ses clients, d'un rendez-vous
          manqué ou d'une réservation non honorée, des erreurs de gestion résultant de données saisies de façon inexacte,
          ni des pertes d'exploitation résultant d'une indisponibilité temporaire du service.
        </p>
      </LegalSection>

      <LegalSection title="11. Résiliation">
        <p>
          L'utilisateur peut cesser d'utiliser la plateforme à tout moment. Bitiko peut suspendre ou clôturer un
          compte en cas de manquement grave aux présentes CGU (éléments illégaux, fraude, comportement portant
          atteinte à d'autres utilisateurs), après notification lorsque les circonstances le permettent.
        </p>
      </LegalSection>

      <LegalSection title="12. Évolution des CGU">
        <p>
          Bitiko peut faire évoluer les présentes CGU, notamment lorsque de nouvelles fonctionnalités sont ajoutées.
          La date de dernière mise à jour figure en tête du document ; les changements importants sont portés à la
          connaissance des utilisateurs. La poursuite de l'utilisation de la plateforme après cette information vaut
          acceptation des nouvelles conditions.
        </p>
      </LegalSection>

      <LegalSection title="13. Droit applicable">
        <p>
          Les présentes CGU sont régies par le droit sénégalais. Tout litige relatif à leur interprétation ou leur
          exécution relève des juridictions compétentes du Sénégal, sauf disposition impérative contraire.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>Pour toute question relative aux présentes CGU, contactez-nous à l'adresse indiquée sur la page d'accueil de la plateforme.</p>
      </LegalSection>
    </LegalLayout>
  )
}
