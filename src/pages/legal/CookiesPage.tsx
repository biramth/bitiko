import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'
import { CONTACT_EMAIL } from '@/config/contact'
import { usePageSeo } from '@/hooks/usePageSeo'
import { LEGAL_META } from '@/seo/legalMeta'
import { isAnalyticsOptedOut, reopenConsent, setAnalyticsOptOut } from '@/lib/cookieConsent'
import { buttonClass } from '@/components/ui/styles'

function AnalyticsOptOutToggle() {
  const [optedOut, setOptedOut] = useState(() => isAnalyticsOptedOut())
  const toggle = () => {
    const next = !optedOut
    setAnalyticsOptOut(next)
    setOptedOut(next)
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3">
      <p className="text-sm text-gray-700">
        {optedOut
          ? 'Vos visites ne sont plus enregistrées sur cet appareil.'
          : 'Vos visites sont comptées de façon anonyme sur cet appareil.'}
      </p>
      <button type="button" onClick={toggle} className={buttonClass({ variant: 'secondary', className: 'mt-2 min-h-10' })}>
        {optedOut ? 'Réactiver la mesure' : "M'exclure de la mesure"}
      </button>
    </div>
  )
}

// Politique cookies : inventaire exact des traceurs, conforme aux
// recommandations de la CNIL (information préalable, consentement de
// 6 mois, retrait aussi simple que l'acceptation). Pas un avis juridique.
export function CookiesPage() {
  usePageSeo(LEGAL_META['legal/cookies'])

  return (
    <LegalLayout title="Politique cookies" updatedAt="30 septembre 2026">
      <LegalSection title="1. Notre principe">
        <p>
          Bitiko distingue deux régimes. La <strong>mesure d'audience interne</strong>, strictement limitée à des
          statistiques anonymes de fréquentation, est exemptée de consentement (recommandations CNIL) : elle
          fonctionne sans la bannière, mais vous pouvez vous y opposer à tout moment (section 3). Les
          <strong> outils tiers</strong> (Vercel, PostHog) ne se chargent qu'après votre choix : à votre première
          visite, une bannière vous propose <strong>Tout accepter</strong> ou <strong>Tout refuser</strong>, à
          égalité — refuser est aussi simple qu'accepter, et votre navigation n'est jamais bloquée en attendant
          votre réponse. Votre choix vaut <strong>6 mois</strong>, puis la bannière réapparaît.
        </p>
      </LegalSection>

      <LegalSection title="2. Mesure interne exemptée de consentement">
        <p>
          Pour améliorer la plateforme, Bitiko compte les visites de ses pages avec son propre outil, sans
          cookie et sans tiers : page consultée (sans les paramètres d'adresse), boutique visitée, hôte du
          site de provenance (sans le reste de l'adresse), type d'appareil, et un identifiant de visite
          aléatoire conservé dans le stockage local de votre navigateur. Cet identifiant est
          <strong> cloisonné par boutique</strong> (une boutique ne partage jamais le vôtre avec une autre),
          vaut <strong>6 mois sans renouvellement</strong>, n'est jamais lié à un compte, et les lignes de
          mesure sont supprimées au bout de <strong>13 mois</strong>.
        </p>
      </LegalSection>

      <LegalSection title="3. S'opposer à la mesure interne">
        <p>
          Votre navigateur peut signaler votre opposition automatiquement (signal « DoNotTrack »), ou utilisez
          le bouton ci-dessous, effet immédiat sur cet appareil :
        </p>
        <AnalyticsOptOutToggle />
      </LegalSection>

      <LegalSection title="4. Traceurs tiers soumis à votre consentement">
        <p>
          Si vous acceptez via la bannière, les outils suivants mesurent la fréquentation pour améliorer la
          plateforme. Si vous refusez, aucun d'eux n'est chargé et aucune donnée de visite ne leur est envoyée.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Vercel Analytics et Speed Insights</strong> — fréquentation et performance des pages, hébergées par Vercel avec l'application.</li>
          <li><strong>PostHog (Union européenne)</strong> — pages vues et évènements d'usage du produit. L'enregistrement de session et les cartes de chaleur sont désactivés ; aucun profil n'est créé pour les visiteurs anonymes.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Stockages strictement nécessaires (sans consentement)">
        <p>
          Les stockages suivants sont indispensables au fonctionnement du service et ne nécessitent pas votre
          consentement :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Panier d'achat</strong> — contenu de votre panier, conservé dans votre navigateur.</li>
          <li><strong>Connexion</strong> — session de votre compte (commerçant ou client).</li>
          <li><strong>Votre choix cookies</strong> — la présente décision, conservée 6 mois comme preuve de votre consentement.</li>
          <li><strong>Préférences d'interface</strong> — menu replié, annonces masquées, visite guidée (espace commerçant uniquement).</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Lecteurs vidéo">
        <p>
          Les vidéos intégrées par les commerçants (YouTube, TikTok, Instagram) sont chargées en mode
          « vie privée renforcée » quand la plateforme le propose (ex. youtube-nocookie). Lire une vidéo peut
          toutefois transmettre des données à ces plateformes, soumises à leurs propres politiques.
        </p>
      </LegalSection>

      <LegalSection title="7. Retirer votre consentement">
        <p>
          Vous pouvez changer d'avis à tout moment : cliquez ci-dessous pour ré-afficher la bannière et choisir
          « Tout refuser ». Si des traceurs tiers avaient été chargés, la page se recharge pour garantir qu'ils
          ne mesurent plus rien. Pour la mesure interne exemptée, utilisez le bouton d'opposition de la
          section 3.
        </p>
        <button type="button" onClick={() => reopenConsent()} className={buttonClass({ variant: 'secondary' })}>
          Revoir mon choix cookies
        </button>
        <p>
          Vous pouvez aussi écrire à <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-700 hover:underline">{CONTACT_EMAIL}</a> pour
          exercer vos droits d'accès, de rectification et de suppression. Voir aussi notre{' '}
          <Link to="/legal/confidentialite" className="font-medium text-brand-700 hover:underline">politique de confidentialité</Link>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
