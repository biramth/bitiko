import { Link } from 'react-router-dom'
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'
import { CONTACT_EMAIL } from '@/config/contact'
import { usePageSeo } from '@/hooks/usePageSeo'
import { LEGAL_META } from '@/seo/legalMeta'

// Conditions générales de vente des boutiques hébergées sur Bitiko.
// Socle commun : chaque vendeur reste responsable de ses propres mentions
// (identité, prix, délais) affichées sur sa vitrine. Point de départ pour le
// lancement pilote, pas un avis juridique (CDP sénégalaise + droit UE cités).
export function SalesTermsPage() {
  usePageSeo(LEGAL_META['legal/cgv'])

  return (
    <LegalLayout title="Conditions générales de vente" updatedAt="30 septembre 2026">
      <LegalSection title="1. Vendeur">
        <p>
          Chaque boutique hébergée sur Bitiko est exploitée par un vendeur professionnel indépendant, dont
          l'identité (nom d'activité, coordonnées, WhatsApp) figure sur sa vitrine. Le contrat de vente est
          conclu directement entre vous et ce vendeur : Bitiko fournit l'outil technique (catalogue, commande,
          transmission sur WhatsApp) mais n'est ni vendeur, ni intermédiaire financier.
        </p>
      </LegalSection>

      <LegalSection title="2. Produits et prix">
        <p>
          Les prix affichés sur chaque boutique s'entendent toutes taxes comprises ou en prix nets selon le
          statut fiscal du vendeur indiqué sur sa vitrine. Les frais de livraison, lorsqu'ils s'appliquent,
          sont affichés par zone avant la validation de la commande ; le total définitif est recalculé au
          moment de la commande (prix et stock à jour) et confirmé par le vendeur sur WhatsApp.
        </p>
      </LegalSection>

      <LegalSection title="3. Commande">
        <p>
          Vous remplissez le formulaire de commande (nom, téléphone, adresse, ville de livraison), choisissez
          le moyen de paiement, acceptez les présentes conditions, puis votre commande est enregistrée et
          transmise au vendeur sur WhatsApp avec le récapitulatif déjà rempli. Le vendeur confirme ou refuse
          votre commande par le moyen de son choix (WhatsApp, téléphone) : la vente n'est définitive qu'à sa
          confirmation.
        </p>
      </LegalSection>

      <LegalSection title="4. Paiement">
        <p>
          Aucun paiement en ligne n'est effectué sur la boutique : vous payez à la livraison (espèces) ou en
          Mobile Money directement avec le vendeur, selon les instructions qu'il vous communique sur WhatsApp.
        </p>
      </LegalSection>

      <LegalSection title="5. Livraison">
        <p>
          Les zones, tarifs et délais de livraison sont ceux annoncés par le vendeur sur sa boutique et
          rappelés avant validation. En cas d'empêchement, le vendeur vous prévient et convient avec vous
          d'une solution (nouveau créneau, annulation).
        </p>
      </LegalSection>

      <LegalSection title="6. Droit de rétractation">
        <p>
          Vous disposez en principe d'un délai de 14 jours après réception pour changer d'avis et être
          remboursé, sans avoir à justifier votre décision. Ce droit ne s'applique pas aux biens périssables,
          aux biens confectionnés sur mesure ou nettement personnalisés, ni aux biens descellés pour des
          raisons d'hygiène. Pour l'exercer, contactez directement le vendeur (coordonnées sur sa vitrine)
          avant l'expiration du délai.
        </p>
      </LegalSection>

      <LegalSection title="7. Garanties et réclamations">
        <p>
          Les produits bénéficient des garanties légales (conformité, vices cachés) selon le droit applicable.
          Toute réclamation (article non conforme, manquant, endommagé) est à adresser directement au vendeur,
          seul responsable du service après-vente. Bitiko n'étant pas partie à la vente, il ne peut ni
          rembourser ni remplacer un article.
        </p>
      </LegalSection>

      <LegalSection title="8. Règlement des litiges">
        <p>
          En cas de différend avec un vendeur, contactez-le d'abord pour chercher une solution amiable. Si
          aucun accord n'est trouvé, vous pouvez recourir à un médiateur de la consommation ([médiateur à
          compléter]) ou saisir les juridictions compétentes. Pour toute question sur la plateforme elle-même,
          écrivez à <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-700 hover:underline">{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title="9. Données personnelles">
        <p>
          Votre nom, téléphone, adresse et commande sont transmis au vendeur pour traiter votre achat. Voir
          notre <Link to="/legal/confidentialite" className="font-medium text-brand-700 hover:underline">politique de confidentialité</Link> et
          notre <Link to="/legal/cookies" className="font-medium text-brand-700 hover:underline">politique cookies</Link>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
