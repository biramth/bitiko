import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'
import { CONTACT_EMAIL } from '@/config/contact'
import { usePageSeo } from '@/hooks/usePageSeo'
import { LEGAL_META } from '@/seo/legalMeta'

// Mentions légales de l'éditeur de la plateforme. Les champs entre crochets
// sont à compléter avec les informations réelles de l'entreprise.
export function LegalNoticePage() {
  usePageSeo(LEGAL_META['legal/mentions-legales'])

  return (
    <LegalLayout title="Mentions légales" updatedAt="30 septembre 2026">
      <LegalSection title="1. Éditeur de la plateforme">
        <p>
          Bitiko est édité par [raison sociale, à compléter], [forme juridique, à compléter] au capital de
          [montant, à compléter], immatriculée sous le numéro [NINEA / RCCM, à compléter], dont le siège social
          est situé à [adresse complète, à compléter].
        </p>
        <p>
          Contact : <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-700 hover:underline">{CONTACT_EMAIL}</a>.
          Directeur de la publication : [nom et prénom, à compléter].
        </p>
      </LegalSection>

      <LegalSection title="2. Hébergement">
        <p>
          L'application est hébergée par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
          Les données (base de données, authentification, fichiers) sont hébergées par Supabase Inc.
        </p>
      </LegalSection>

      <LegalSection title="3. Activité">
        <p>
          Bitiko fournit aux professionnels un outil technique pour créer et gérer leur espace en ligne
          (catalogue, commandes, rendez-vous, réservations, équipe, finances). Bitiko n'est ni vendeur, ni
          acheteur, ni intermédiaire financier dans les transactions conclues entre un professionnel
          utilisateur et ses propres clients : chaque boutique est exploitée sous la seule responsabilité
          du professionnel qui l'a créée, dont l'identité figure sur sa vitrine.
        </p>
      </LegalSection>

      <LegalSection title="4. Propriété intellectuelle">
        <p>
          La marque Bitiko, le logiciel de la plateforme et son interface restent la propriété de l'éditeur.
          Les contenus publiés par les professionnels utilisateurs (textes, photos, logos) restent leur
          propriété exclusive. Toute reproduction non autorisée des éléments de la plateforme est interdite.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
