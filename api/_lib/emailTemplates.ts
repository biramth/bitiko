// Branded HTML for emails sent through Resend (outside Supabase Auth's own
// mailer). Table-based layout, inline styles only — the safe subset that
// survives Gmail/Outlook/Apple Mail stripping <style> blocks and flex/grid.
// The logo is a hosted PNG (public/email-logo.png) since email clients
// don't render inline SVG; `alt` carries real text so the email still reads
// fine with images blocked (the default in most clients until a user opts in).

function badge(number: number, title: string, description: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
    <tr>
      <td style="padding:14px;background-color:#fdf3e7;border-radius:12px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:30px;height:30px;min-width:30px;background-color:#c2481c;border-radius:15px;color:#ffffff;font-size:14px;font-weight:700;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;">${number}</td>
            <td style="width:12px;"></td>
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
  heading,
  body,
  extra,
  buttonLabel,
  buttonUrl,
  footnote,
}: {
  origin: string
  preheader: string
  heading: string
  body: string
  extra?: string
  buttonLabel: string
  buttonUrl: string
  footnote: string
}): string {
  return `<div style="background-color:#f3ead9;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f3ead9;">${preheader}</div>
  <div style="max-width:520px;margin:0 auto;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0dcc4;">
      <tr>
        <td style="background-color:#c2481c;padding:36px 32px 30px;text-align:center;">
          <img src="${origin}/email-logo.png" width="56" height="56" alt="Bitiko" style="display:block;margin:0 auto;border-radius:12px;">
          <div style="margin-top:14px;color:#ffffff;font-size:14px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Bitiko</div>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 32px 4px;text-align:center;">
          <h1 style="margin:0 0 14px;font-size:21px;line-height:1.35;color:#17152e;font-family:Arial,Helvetica,sans-serif;">${heading}</h1>
          <p style="margin:0 0 26px;font-size:14.5px;line-height:1.65;color:#5b5686;font-family:Arial,Helvetica,sans-serif;">${body}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 8px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="border-radius:10px;background-color:#c2481c;">
                <a href="${buttonUrl}" style="display:inline-block;padding:15px 34px;font-size:14.5px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;font-family:Arial,Helvetica,sans-serif;">${buttonLabel}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${extra ? `<tr><td style="padding:28px 32px 4px;">${extra}</td></tr>` : ''}
      <tr>
        <td style="padding:28px 32px 32px;">
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
    badge(1, 'Ajoute tes produits', 'Photo, prix, stock — quelques minutes suffisent pour ton premier article.'),
    badge(2, 'Partage ton lien', `Envoie <strong>${cleanShopUrl}</strong> à tes clients sur WhatsApp, Instagram ou Facebook.`),
    badge(3, 'Reçois tes commandes', 'Chaque commande arrive directement sur ton WhatsApp, prête à confirmer.'),
  ].join('')

  return shell({
    origin,
    preheader: `${shopName} est prête — ajoute ton premier produit pour commencer à vendre.`,
    heading: `Félicitations, ${shopName} est en ligne !`,
    body: `Ta boutique est prête à l'adresse <strong>${cleanShopUrl}</strong>. Voici comment démarrer :`,
    extra: steps,
    buttonLabel: 'Ajouter mon premier produit',
    buttonUrl: addProductUrl,
    footnote: "Besoin d'aide pour démarrer ? Réponds simplement à cet email, on te répond directement.",
  })
}
