import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'
import { CONTACT_EMAIL } from '@/config/contact'
import { usePageSeo } from '@/hooks/usePageSeo'
import { LEGAL_META } from '@/seo/legalMeta'

// Déclaration d'accessibilité : état honnête (partiellement conforme),
// contact et voie de recours. À faire évoluer avec les audits.
export function AccessibilityPage() {
  usePageSeo(LEGAL_META['legal/accessibilite'])

  return (
    <LegalLayout title="Accessibilité" updatedAt="30 septembre 2026">
      <LegalSection title="1. Engagement">
        <p>
          Bitiko s'engage à rendre sa plateforme et les boutiques qu'elle héberge accessibles au plus grand
          nombre, en suivant les recommandations internationales WCAG (objectif : niveau AA).
        </p>
      </LegalSection>

      <LegalSection title="2. État de conformité">
        <p>
          La plateforme est <strong>partiellement conforme</strong> : navigation au clavier avec lien
          d'évitement « Aller au contenu », focus visible, pages en français, formulaires étiquetés, images
          décoratives ignorées par les lecteurs d'écran, contrastes vérifiés sur l'interface Bitiko (ratio
          minimal 4,5:1). Les contenus non encore conformes : les couleurs choisies librement par les
          commerçants pour leur vitrine peuvent ne pas respecter les contrastes, et certaines vidéos de
          démonstration ne sont pas sous-titrées.
        </p>
      </LegalSection>

      <LegalSection title="3. Signaler un problème">
        <p>
          Si vous rencontrez une difficulté d'accès à un contenu ou un service, écrivez-nous à{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-700 hover:underline">{CONTACT_EMAIL}</a> en
          décrivant le problème et la page concernée : nous vous répondrons et chercherons une solution.
        </p>
      </LegalSection>

      <LegalSection title="4. Voies de recours">
        <p>
          Si notre réponse ne vous satisfait pas, vous pouvez saisir l'autorité de protection des données
          compétente (Commission de Protection des Données Personnelles au Sénégal, ou CNIL pour les visiteurs
          européens) ou le Défenseur des droits.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
