// Branded HTML for emails sent through Resend (outside Supabase Auth's own
// mailer). Table-based layout, inline styles only — the safe subset that
// survives Gmail/Outlook/Apple Mail stripping <style> blocks and flex/grid.
// The logo is a hosted PNG (public/email-logo.png) since email clients
// don't render inline SVG; `alt` carries real text so the email still reads
// fine with images blocked (the default in most clients until a user opts in).

// Every value interpolated below that can trace back to merchant-controlled
// input (shop name/slug, WhatsApp number, account email) must go through
// this — these emails render in a real inbox, and an unescaped shop name is
// an HTML-injection vector against whoever reads the email (notably the
// platform admin's own inbox for proUpgradeRequestEmailHtml).
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface BadgeColors {
  cardBg: string
  numberBg: string
  numberColor: string
}

const BADGE_PALETTE: BadgeColors[] = [
  { cardBg: '#fdf3e7', numberBg: '#c2481c', numberColor: '#ffffff' }, // brand orange
  { cardBg: '#eef0fb', numberBg: '#221f45', numberColor: '#ffffff' }, // ink navy
  { cardBg: '#fff8e1', numberBg: '#f2b705', numberColor: '#17152e' }, // gold
]

function badge(index: number, title: string, description: string): string {
  const { cardBg, numberBg, numberColor } = BADGE_PALETTE[index % BADGE_PALETTE.length]
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
    <tr>
      <td style="padding:14px 16px;background-color:${cardBg};border-radius:12px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:30px;height:30px;min-width:30px;background-color:${numberBg};border-radius:15px;color:${numberColor};font-size:14px;font-weight:700;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;">${index + 1}</td>
            <td style="width:14px;"></td>
            <td style="font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:14px;font-weight:700;color:#17152e;line-height:1.4;">${title}</div>
              <div style="font-size:13px;color:#6b6690;line-height:1.5;margin-top:2px;">${description}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}

function shell({
  origin,
  preheader,
  eyebrow,
  heading,
  body,
  urlChip,
  extra,
  buttonLabel,
  buttonUrl,
  footnote,
}: {
  origin: string
  preheader: string
  eyebrow: string
  heading: string
  body: string
  urlChip?: string
  extra?: string
  buttonLabel: string
  buttonUrl: string
  footnote: string
}): string {
  return `<div style="background-color:#f3ead9;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f3ead9;">${preheader}</div>
  <div style="max-width:540px;margin:0 auto;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #f0dcc4;">
      <tr>
        <td style="background-color:#f2b705;height:6px;line-height:6px;font-size:0;">&nbsp;</td>
      </tr>
      <tr>
        <td style="background-color:#17152e;padding:40px 32px 32px;text-align:center;">
          <img src="${origin}/email-logo.png" width="60" height="60" alt="Bitiko" style="display:block;margin:0 auto;border-radius:14px;">
          <div style="margin-top:16px;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:-0.01em;font-family:Arial,Helvetica,sans-serif;">Bitiko</div>
          <div style="margin-top:5px;color:#f2b705;font-size:11.5px;font-weight:bold;letter-spacing:0.14em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">${eyebrow}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:40px 32px 8px;text-align:center;">
          <h1 style="margin:0 0 14px;font-size:24px;line-height:1.3;color:#17152e;font-family:Arial,Helvetica,sans-serif;">${heading}</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#5b5686;font-family:Arial,Helvetica,sans-serif;">${body}</p>
        </td>
      </tr>
      ${
        urlChip
          ? `<tr>
        <td style="padding:0 32px 26px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;background-color:#fdf3e7;border-radius:999px;border:1px solid #f0dcc4;">
            <tr><td style="padding:10px 22px;font-size:13.5px;font-weight:bold;color:#9c3814;font-family:'Courier New',Courier,monospace;">🌐&nbsp; ${urlChip}</td></tr>
          </table>
        </td>
      </tr>`
          : ''
      }
      <tr>
        <td style="padding:0 32px 8px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="border-radius:12px;background-color:#c2481c;">
                <a href="${buttonUrl}" style="display:inline-block;padding:16px 38px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;font-family:Arial,Helvetica,sans-serif;">${buttonLabel} &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${extra ? `<tr><td style="padding:32px 32px 4px;">${extra}</td></tr>` : ''}
      <tr>
        <td style="padding:28px 32px 0;">
          <div style="height:1px;background-color:#f0dcc4;line-height:1px;font-size:0;">&nbsp;</div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 32px;">
          <p style="margin:0;font-size:12px;line-height:1.55;color:#9c3814;text-align:center;font-family:Arial,Helvetica,sans-serif;">${footnote}</p>
        </td>
      </tr>
    </table>
    <p style="text-align:center;margin:22px 0 0;font-size:11.5px;line-height:1.6;color:#a8987f;font-family:Arial,Helvetica,sans-serif;">
      Bitiko — vendez sur WhatsApp avec votre propre boutique en ligne<br>Une question ? Réponds directement à cet email.
    </p>
  </div>
</div>`
}

/** Internal ops notification — not brand-facing, so a plain layout is enough. */
export function proUpgradeRequestEmailHtml({
  shopName,
  shopSlug,
  whatsappNumber,
  ownerEmail,
  amount,
  planLabel = 'Pro',
}: {
  shopName: string
  shopSlug: string
  whatsappNumber: string
  ownerEmail: string
  amount: number
  planLabel?: string
}): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#17152e;line-height:1.6;">
    <p><strong>${escapeHtml(shopName)}</strong> (${escapeHtml(shopSlug)}.bitiko.shop) dit avoir payé ${amount} F CFA via le lien Wave pour passer en ${escapeHtml(planLabel)}.</p>
    <ul>
      <li>Numéro WhatsApp du commerçant : ${escapeHtml(whatsappNumber)}</li>
      <li>Email du compte : ${escapeHtml(ownerEmail)}</li>
    </ul>
    <p>Vérifie l'onglet Transactions de l'app Wave Business (expéditeur/montant), puis active le plan ${escapeHtml(planLabel)} pour cette boutique.</p>
  </div>`
}

// ---------------------------------------------------------------------------
// Emails automatiques personnalisables (table `automated_emails`, migration
// 0138, édités depuis /plateforme/campagnes). La structure — habillage,
// titres, encadrés conseils — reste dans le code ; l'objet, le contenu, le
// bouton et l'interrupteur actif/inactif vivent en base. Sans surcharge
// (ligne absente), le contenu historique est utilisé.
// ---------------------------------------------------------------------------

export type AutomatedEmailKey = 'welcome' | 'plan-activated' | 'renewal-reminder'

export interface AutomatedEmailVars {
  shopName: string
  shopUrl: string
  ownerName: string
  planName?: string
  periodEndLabel?: string
  amountLabel?: string
}

export interface AutomatedEmailOverride {
  subject: string
  body: string
  buttonLabel: string | null
  buttonUrl: string | null
}

function substituteAutomatedVariables(text: string, vars: AutomatedEmailVars): string {
  return substituteCampaignVariables(text, { shopName: vars.shopName, shopUrl: vars.shopUrl, ownerName: vars.ownerName })
    .replace(/\{\{\s*plan_name\s*\}\}/gi, vars.planName ?? '')
    .replace(/\{\{\s*period_end\s*\}\}/gi, vars.periodEndLabel ?? '')
    .replace(/\{\{\s*amount\s*\}\}/gi, vars.amountLabel ?? '')
}

function substituteAutomatedUrl(url: string, vars: AutomatedEmailVars): string {
  return substituteCampaignUrl(url, { shopName: vars.shopName, shopUrl: vars.shopUrl, ownerName: vars.ownerName })
    .replace(/\{\{\s*plan_name\s*\}\}/gi, encodeURIComponent(vars.planName ?? ''))
    .replace(/\{\{\s*period_end\s*\}\}/gi, encodeURIComponent(vars.periodEndLabel ?? ''))
    .replace(/\{\{\s*amount\s*\}\}/gi, encodeURIComponent(vars.amountLabel ?? ''))
}

interface AutomatedEmailConfig {
  eyebrow: string
  heading: (vars: AutomatedEmailVars) => string
  footnote: string
  urlChip: boolean
  extra: 'welcome-steps' | 'plan-perks' | null
  defaultSubject: string
  defaultBody: string
  defaultButtonLabel: string
  defaultButtonUrl: string
}

const AUTOMATED_EMAILS: Record<AutomatedEmailKey, AutomatedEmailConfig> = {
  welcome: {
    eyebrow: 'Vendez sur WhatsApp',
    heading: (vars) => `🎉 ${escapeHtml(vars.shopName)} est en ligne !`,
    footnote: "Besoin d'aide pour démarrer ? Réponds simplement à cet email, on te répond directement.",
    urlChip: true,
    extra: 'welcome-steps',
    defaultSubject: '{{shop_name}} est en ligne — Bitiko',
    defaultBody: 'Ta boutique est prête à recevoir tes clients. Voici comment démarrer :',
    defaultButtonLabel: 'Ajouter mon premier produit',
    defaultButtonUrl: '/admin/produits/nouveau',
  },
  'plan-activated': {
    eyebrow: 'Abonnement activé',
    heading: (vars) => `🎉 Bienvenue dans Bitiko ${escapeHtml(vars.planName ?? 'Pro')} !`,
    footnote: 'Une question sur ton abonnement ? Réponds directement à cet email.',
    urlChip: false,
    extra: 'plan-perks',
    defaultSubject: 'Bienvenue dans Bitiko {{plan_name}} — {{shop_name}}',
    defaultBody: `Ton paiement a été vérifié — **{{shop_name}}** est maintenant en {{plan_name}}, actif jusqu'au **{{period_end}}**.`,
    defaultButtonLabel: 'Aller sur mon tableau de bord',
    defaultButtonUrl: '/admin',
  },
  'renewal-reminder': {
    eyebrow: 'Renouvellement',
    heading: (vars) => `Ton abonnement ${escapeHtml(vars.planName ?? 'Pro')} expire bientôt`,
    footnote:
      "Sans renouvellement, ta boutique repasse automatiquement en plan gratuit à la date d'échéance — tes produits et données restent intacts.",
    urlChip: false,
    extra: null,
    defaultSubject: 'Ton abonnement expire bientôt — {{shop_name}}',
    defaultBody: `L'abonnement {{plan_name}} de **{{shop_name}}** arrive à échéance le **{{period_end}}**. Renouvelle-le pour {{amount}} afin de garder tes fonctionnalités {{plan_name}} sans interruption.`,
    defaultButtonLabel: 'Renouveler mon abonnement',
    defaultButtonUrl: '/admin/parametres/compte?billing=1',
  },
}

function automatedExtra(kind: 'welcome-steps' | 'plan-perks'): string {
  const items =
    kind === 'welcome-steps'
      ? [
          ['Ajoute tes produits', 'Photo, prix, stock — quelques minutes suffisent pour ton premier article.'],
          ['Partage ton lien', 'Envoie-le à tes clients sur WhatsApp, Instagram ou Facebook.'],
          ['Reçois tes commandes', 'Chaque commande arrive directement sur ton WhatsApp, prête à confirmer.'],
        ]
      : [
          ['Produits illimités', 'Fini la limite de 8 produits actifs.'],
          ['Éditeur visuel complet', 'Tous les templates et blocs de personnalisation débloqués.'],
          ['Sans "Propulsé par Bitiko"', 'Ta boutique passe sur ton nom, pas sur le nôtre.'],
        ]
  return items.map(([title, description], index) => badge(index, title, description)).join('')
}

/** Résout le lien du bouton : variables substituées, chemin relatif préfixé
 *  par l'origine, repli sur le tableau de bord si le résultat n'est pas
 *  http(s) — la validation serveur garantit déjà ce format, ceci est la
 *  ceinture de sécurité au rendu. */
function resolveAutomatedButtonUrl(rawUrl: string, vars: AutomatedEmailVars, origin: string, fallbackPath: string): string {
  const substituted = substituteAutomatedUrl(rawUrl, vars).trim() || fallbackPath
  const absolute = substituted.startsWith('/') ? `${origin}${substituted}` : substituted
  return /^https?:\/\//i.test(absolute) ? absolute : `${origin}/admin`
}

/**
 * Rend un email automatique : objet (texte brut pour l'en-tête) + HTML dans
 * l'habillage Bitiko. Mêmes règles de sécurité que les campagnes — variables
 * substituées avant échappement, seul **gras** autorisé ensuite.
 */
export function automatedEmailHtml({
  key,
  origin,
  vars,
  override,
}: {
  key: AutomatedEmailKey
  origin: string
  vars: AutomatedEmailVars
  override: AutomatedEmailOverride | null
}): { subject: string; html: string } {
  const config = AUTOMATED_EMAILS[key]
  const customized = override && override.subject.trim() && override.body.trim() ? override : null
  const subject = substituteAutomatedVariables(customized ? customized.subject : config.defaultSubject, vars)
  const body = renderCampaignBody(
    substituteAutomatedVariables(customized ? customized.body : config.defaultBody, vars),
    { shopName: vars.shopName, shopUrl: vars.shopUrl, ownerName: vars.ownerName },
  )
  const buttonLabel = escapeHtml(
    substituteAutomatedVariables(customized?.buttonLabel?.trim() || config.defaultButtonLabel, vars),
  )
  const buttonUrl = escapeHtml(
    resolveAutomatedButtonUrl(customized?.buttonUrl?.trim() || config.defaultButtonUrl, vars, origin, config.defaultButtonUrl),
  )

  return {
    subject,
    html: shell({
      origin,
      preheader: escapeHtml(subject),
      eyebrow: config.eyebrow,
      heading: config.heading(vars),
      body,
      urlChip: config.urlChip ? escapeHtml(vars.shopUrl.replace(/^https?:\/\//, '')) : undefined,
      extra: config.extra ? automatedExtra(config.extra) : undefined,
      buttonLabel,
      buttonUrl,
      footnote: config.footnote,
    }),
  }
}

/** Relance unique, ~24 h après l'inscription, d'un compte qui n'a pas encore créé sa boutique. */
export function onboardingNudgeEmailHtml({ origin, firstName }: { origin: string; firstName: string | null }): string {
  const greeting = firstName ? `${escapeHtml(firstName)}, ` : ''
  const steps = [
    badge(0, 'Ton nom et ton activité', 'Boutique, salon, restauration… choisis ce qui te ressemble.'),
    badge(1, 'Ton numéro WhatsApp', "C'est là que tes clients te contactent et passent commande."),
    badge(2, "C'est en ligne", 'Ton site est prêt tout de suite, tu le peaufines ensuite à ton rythme.'),
  ].join('')

  return shell({
    origin,
    preheader: 'Il ne te manque que trois infos pour mettre ton activité en ligne.',
    eyebrow: "Ton espace t'attend",
    heading: `${greeting}ta boutique est à une minute`,
    body: "Tu as créé ton compte Bitiko, mais ton activité n'est pas encore en ligne. Trois informations suffisent :",
    extra: steps,
    buttonLabel: 'Créer ma boutique',
    buttonUrl: `${origin}/admin/onboarding`,
    footnote: "Tu reçois ce message une seule fois, parce que ton compte n'a pas encore de boutique. Gratuit, sans carte bancaire.",
  })
}

/**
 * Substitutes the campaign variables (case-insensitive) in raw merchant text.
 * Runs before HTML-escaping so a shop name containing "<" can't smuggle markup.
 */
function substituteCampaignVariables(
  text: string,
  { shopName, shopUrl, ownerName }: { shopName: string; shopUrl: string; ownerName: string },
): string {
  return text
    .replace(/\{\{\s*shop_name\s*\}\}/gi, shopName)
    .replace(/\{\{\s*shop_url\s*\}\}/gi, shopUrl.replace(/^https?:\/\//, ''))
    .replace(/\{\{\s*owner_name\s*\}\}/gi, ownerName)
}

/**
 * Same idea for a link target: text is user-authored and lands in an href, so
 * it's escaped (not sanitized — the caller only accepts http(s)/relative
 * paths). `{{shop_url}}` keeps its protocol here so the href stays absolute,
 * and free-text variables are URL-encoded so a space can't break the link.
 */
function substituteCampaignUrl(
  url: string,
  { shopName, shopUrl, ownerName }: { shopName: string; shopUrl: string; ownerName: string },
): string {
  return url
    .replace(/\{\{\s*shop_url\s*\}\}/gi, shopUrl)
    .replace(/\{\{\s*shop_name\s*\}\}/gi, encodeURIComponent(shopName))
    .replace(/\{\{\s*owner_name\s*\}\}/gi, encodeURIComponent(ownerName))
}

/**
 * Renders a merchant-authored campaign body: variables are substituted first
 * (so a shop name containing "<" can't smuggle markup), then the whole thing
 * is HTML-escaped, and only then is the tiny markdown subset applied — the
 * order matters for safety.
 */
function renderCampaignBody(body: string, vars: { shopName: string; shopUrl: string; ownerName: string }): string {
  return escapeHtml(substituteCampaignVariables(body, vars))
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>')
}

export interface CampaignEmailInput {
  origin: string
  subject: string
  body: string
  shopName: string
  shopUrl: string
  ownerName: string
  /** Label of the call-to-action button; falls back to the dashboard prompt. */
  buttonLabel?: string
  /** Target of the call-to-action button; empty falls back to the dashboard. */
  buttonUrl?: string
  /** Lien de désabonnement signé (api/_lib/unsubscribeToken.ts) — calculé par
   *  l'appelant, qui en a aussi besoin pour l'en-tête List-Unsubscribe. */
  unsubscribeUrl: string
}

/**
 * A platform-team campaign rendered in the branded shell. Supported variables
 * (case-insensitive): {{shop_name}}, {{shop_url}}, {{owner_name}} — in the
 * body, the object and the button link.
 */
export function campaignEmailHtml({
  origin,
  subject,
  body,
  shopName,
  shopUrl,
  ownerName,
  buttonLabel,
  buttonUrl,
  unsubscribeUrl,
}: CampaignEmailInput): string {
  const vars = { shopName, shopUrl, ownerName }
  const effectiveSubject = substituteCampaignVariables(subject, vars)
  const effectiveButtonUrl = buttonUrl?.trim() ? substituteCampaignUrl(buttonUrl.trim(), vars) : `${origin}/admin`

  return shell({
    origin,
    preheader: escapeHtml(effectiveSubject),
    eyebrow: 'Bitiko',
    heading: escapeHtml(effectiveSubject),
    body: renderCampaignBody(body, vars),
    buttonLabel: escapeHtml(buttonLabel?.trim() || 'Ouvrir mon tableau de bord'),
    buttonUrl: escapeHtml(effectiveButtonUrl),
    footnote: `Tu reçois cet email car tu as une boutique sur Bitiko. Réponds directement à cet email pour toute question.<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#9c3814;text-decoration:underline;">Se désabonner de ces emails</a>`,
  })
}

/**
 * Sent when the platform team adds a member (or promotes existing ones).
 * Two flavors controlled by `isNewAccount`:
 *  - existing user: announce their new role and point to the platform space;
 *  - brand-new account (created by the invitation): the button is the
 *    password-recovery link (`token_hash` + `type=recovery`) that lets the
 *    invitee choose a password. The token was generated but never emailed, so
 *    this Resend mail is the only carrier.
 */
export function teamWelcomeEmailHtml({
  origin,
  email,
  fullName,
  roleLabel,
  isNewAccount,
  setupUrl,
  platformUrl,
}: {
  origin: string
  email: string
  fullName?: string | null
  roleLabel: string
  isNewAccount: boolean
  /** Password-recovery token link (/reinitialiser-mot-de-passe?token_hash=…&type=recovery). */
  setupUrl?: string
  platformUrl: string
}): string {
  const greeting = fullName?.trim() ? `Bonjour ${fullName.trim()},` : 'Bonjour,'
  const heading = isNewAccount ? 'Bienvenue dans l’équipe Bitiko !' : 'Ton rôle sur la plateforme a changé'

  const body = isNewAccount
    ? `Ton compte Bitiko vient d’être créé par l’équipe plateforme. Voici la marche à suivre :<br><br>` +
      `1. Clique sur le bouton ci-dessous pour <strong>choisir le mot de passe</strong> de ton compte (<strong>${escapeHtml(email)}</strong>).<br>` +
      `2. Une fois connecté·e, tu pourras accéder à la plateforme Bitiko avec le rôle <strong>${escapeHtml(roleLabel)}</strong>.`
    : `L’équipe plateforme t’a donné le rôle <strong>${escapeHtml(roleLabel)}</strong> sur ton compte Bitiko (<strong>${escapeHtml(email)}</strong>).<br><br>` +
      `Tu peux dès maintenant te connecter et accéder à tes nouveaux outils.`

  const buttonLabel = isNewAccount ? 'Choisir mon mot de passe' : 'Ouvrir la plateforme'
  const buttonUrl = isNewAccount && setupUrl ? setupUrl : platformUrl

  return shell({
    origin,
    preheader: isNewAccount
      ? 'Ton compte Bitiko a été créé — choisis ton mot de passe pour rejoindre l’équipe.'
      : `Ton rôle sur la plateforme Bitiko : ${roleLabel}.`,
    eyebrow: 'Plateforme Bitiko',
    heading,
    body: `${greeting}<br><br>${body}`,
    buttonLabel,
    buttonUrl,
    footnote: isNewAccount
      ? 'Ce lien est valide 24h. Il est généré par l’équipe Bitiko : si tu n’attendais pas cette invitation, ignore cet email.'
      : 'Une question sur tes nouveaux accès ? Réponds directement à cet email.',
  })
}

/** Alerte marchand (nouvelle commande, stock bas…) : même habillage que les autres emails Bitiko.
 *  `body` est du texte brut (les variables viennent de clients : tout est échappé ici). */
export function merchantAlertEmailHtml({
  origin,
  shopName,
  heading,
  body,
  buttonLabel,
  path,
}: {
  origin: string
  shopName: string
  heading: string
  body: string
  buttonLabel: string
  /** Chemin de l'admin à ouvrir (ex. /admin/commandes). */
  path: string
}): string {
  return shell({
    origin,
    preheader: escapeHtml(heading),
    eyebrow: escapeHtml(shopName),
    heading: escapeHtml(heading),
    body: escapeHtml(body).replace(/\n/g, '<br>'),
    buttonLabel: escapeHtml(buttonLabel),
    buttonUrl: escapeHtml(`${origin}${path}`),
    footnote: 'Vous recevez cette alerte car elle est activée sur votre boutique. Vous pouvez la désactiver dans Paramètres › Notifications.',
  })
}
