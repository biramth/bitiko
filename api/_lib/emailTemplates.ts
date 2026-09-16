// Branded HTML for emails sent through Resend (outside Supabase Auth's own
// mailer). Table-based layout, inline styles only — the safe subset that
// survives Gmail/Outlook/Apple Mail stripping <style> blocks and flex/grid.
// The logo is a hosted PNG (public/email-logo.png) since email clients
// don't render inline SVG; `alt` carries real text so the email still reads
// fine with images blocked (the default in most clients until a user opts in).

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
    <p><strong>${shopName}</strong> (${shopSlug}.bitiko.shop) dit avoir payé ${amount} F CFA via le lien Wave pour passer en ${planLabel}.</p>
    <ul>
      <li>Numéro WhatsApp du commerçant : ${whatsappNumber}</li>
      <li>Email du compte : ${ownerEmail}</li>
    </ul>
    <p>Vérifie l'onglet Transactions de l'app Wave Business (expéditeur/montant), puis active le plan ${planLabel} pour cette boutique.</p>
  </div>`
}

export function proActivatedEmailHtml({
  origin,
  shopName,
  periodEndLabel,
  planLabel = 'Pro',
}: {
  origin: string
  shopName: string
  periodEndLabel: string
  planLabel?: string
}): string {
  const perks = [
    badge(0, 'Produits illimités', 'Fini la limite de 8 produits actifs.'),
    badge(1, 'Éditeur visuel complet', 'Tous les templates et blocs de personnalisation débloqués.'),
    badge(2, 'Sans "Propulsé par Bitiko"', 'Ta boutique passe sur ton nom, pas sur le nôtre.'),
  ].join('')

  return shell({
    origin,
    preheader: `${shopName} est maintenant en ${planLabel} — actif jusqu'au ${periodEndLabel}.`,
    eyebrow: 'Abonnement activé',
    heading: `🎉 Bienvenue dans Bitiko ${planLabel} !`,
    body: `Ton paiement a été vérifié — <strong>${shopName}</strong> est maintenant en ${planLabel}, actif jusqu'au <strong>${periodEndLabel}</strong>.`,
    extra: perks,
    buttonLabel: 'Aller sur mon tableau de bord',
    buttonUrl: `${origin}/admin`,
    footnote: 'Une question sur ton abonnement ? Réponds directement à cet email.',
  })
}

export function renewalReminderEmailHtml({
  origin,
  shopName,
  periodEndLabel,
  amountLabel,
}: {
  origin: string
  shopName: string
  periodEndLabel: string
  amountLabel: string
}): string {
  return shell({
    origin,
    preheader: `L'abonnement Pro de ${shopName} expire le ${periodEndLabel}.`,
    eyebrow: 'Renouvellement',
    heading: 'Ton abonnement Pro expire bientôt',
    body: `L'abonnement Pro de <strong>${shopName}</strong> arrive à échéance le <strong>${periodEndLabel}</strong>. Renouvelle-le pour ${amountLabel} afin de garder tes fonctionnalités Pro sans interruption.`,
    buttonLabel: 'Renouveler mon abonnement',
    buttonUrl: `${origin}/admin/facturation`,
    footnote: "Sans renouvellement, ta boutique repasse automatiquement en plan gratuit à la date d'échéance — tes produits et données restent intacts.",
  })
}

export function welcomeEmailHtml({
  origin,
  shopName,
  shopUrl,
  addProductUrl,
}: {
  origin: string
  shopName: string
  shopUrl: string
  addProductUrl: string
}): string {
  const cleanShopUrl = shopUrl.replace(/^https?:\/\//, '')
  const steps = [
    badge(0, 'Ajoute tes produits', 'Photo, prix, stock — quelques minutes suffisent pour ton premier article.'),
    badge(1, 'Partage ton lien', 'Envoie-le à tes clients sur WhatsApp, Instagram ou Facebook.'),
    badge(2, 'Reçois tes commandes', 'Chaque commande arrive directement sur ton WhatsApp, prête à confirmer.'),
  ].join('')

  return shell({
    origin,
    preheader: `${shopName} est prête — ajoute ton premier produit pour commencer à vendre.`,
    eyebrow: 'Vendez sur WhatsApp',
    heading: `🎉 ${shopName} est en ligne !`,
    body: 'Ta boutique est prête à recevoir tes clients. Voici comment démarrer :',
    urlChip: cleanShopUrl,
    extra: steps,
    buttonLabel: 'Ajouter mon premier produit',
    buttonUrl: addProductUrl,
    footnote: "Besoin d'aide pour démarrer ? Réponds simplement à cet email, on te répond directement.",
  })
}
