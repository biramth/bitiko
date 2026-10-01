import { PLANS, type PlanKey } from './plans'

/** Un « moment d'activation » : l'instant précis où un besoin réel du commerçant
 *  rencontre une capacité d'un plan supérieur. Le message parle d'abord de ce que
 *  le commerçant va pouvoir faire ; le prix n'est qu'une information secondaire. */
export type UpgradeMomentKey =
  | 'products'
  | 'product-photos'
  | 'product-variants'
  | 'collaborators'
  | 'services'
  | 'team-members'
  | 'custom-pages'
  | 'custom-sections'
  | 'builder-styles'
  | 'branding'
  | 'finance-history'
  | 'finance-comparison'
  | 'finance-entries'
  | 'tontines'
  | 'tontine-members'
  | 'category-tiles'
  | 'analytics'
  | 'seo'

export type PaidPlanKey = Exclude<PlanKey, 'free'>

export interface UpgradeMoment {
  /** Le plan qui débloque ce besoin (le plus petit qui suffit). */
  plan: PaidPlanKey
  title: string
  body: string
  cta: string
}

const label = (plan: PaidPlanKey) => PLANS[plan].label
const continueWith = (plan: PaidPlanKey) => `Continuer avec ${label(plan)}`
const activate = (plan: PaidPlanKey) => `Activer ${label(plan)}`

type Builder = (current: PlanKey) => UpgradeMoment

/** Quota qui monte d'un cran : Essentiel d'abord, Pro quand Essentiel est atteint. */
function quota(config: {
  essential: { title: string; body: string }
  pro: { title: string; body: string }
}): Builder {
  return (current) => {
    const plan: PaidPlanKey = current === 'essential' ? 'pro' : 'essential'
    const copy = plan === 'pro' ? config.pro : config.essential
    return { plan, ...copy, cta: continueWith(plan) }
  }
}

const BUILDERS: Record<UpgradeMomentKey, Builder> = {
  products: quota({
    essential: {
      title: 'Votre catalogue est prêt à accueillir davantage de produits.',
      body: `Avec Essentiel, vous pouvez ajouter jusqu'à ${PLANS.essential.maxActiveProducts} produits et continuer à développer votre boutique.`,
    },
    pro: {
      title: 'Votre boutique continue de grandir.',
      body: 'Avec Pro, votre catalogue n’a plus de limite : ajoutez autant de produits que vous en avez.',
    },
  }),
  'product-photos': () => ({
    plan: 'essential',
    title: 'Ce produit mérite plus de photos.',
    body: 'Avec Essentiel, présentez chaque article avec autant de photos que nécessaire, y compris une photo par variante.',
    cta: continueWith('essential'),
  }),
  'product-variants': () => ({
    plan: 'essential',
    title: 'Ce produit existe en plusieurs déclinaisons ?',
    body: 'Avec Essentiel, proposez autant de variantes que nécessaire (tailles, couleurs, formats…), chacune avec son stock et son prix.',
    cta: continueWith('essential'),
  }),
  collaborators: () => ({
    plan: 'pro',
    title: 'Votre activité mérite d’être partagée.',
    body: 'Avec Pro, invitez un manager ou un vendeur : catalogue, commandes et clients partagés, pendant que les paramètres et l’abonnement restent à vous.',
    cta: 'Ajouter mon équipe avec Pro',
  }),
  services: quota({
    essential: {
      title: 'Votre carte de prestations s’étoffe.',
      body: `Avec Essentiel, proposez jusqu'à ${PLANS.essential.maxActiveServices} prestations à la réservation en ligne.`,
    },
    pro: {
      title: 'Votre carte de prestations s’étoffe encore.',
      body: 'Avec Pro, proposez autant de prestations que vous le souhaitez.',
    },
  }),
  'team-members': quota({
    essential: {
      title: 'Votre équipe s’agrandit.',
      body: `Avec Essentiel, présentez jusqu'à ${PLANS.essential.maxTeamMembers} personnes sur votre site, chacune réservable par vos clients.`,
    },
    pro: {
      title: 'Votre équipe s’agrandit encore.',
      body: 'Avec Pro, présentez toute votre équipe sur votre site, sans limite.',
    },
  }),
  'custom-pages': quota({
    essential: {
      title: 'Cette page a sa place sur votre site.',
      body: `Avec Essentiel, créez jusqu'à ${PLANS.essential.maxCustomPages} pages personnalisées : à propos, tarifs, questions fréquentes…`,
    },
    pro: {
      title: 'Votre site prend de l’ampleur.',
      body: 'Avec Pro, créez autant de pages personnalisées que votre activité en demande.',
    },
  }),
  'custom-sections': quota({
    essential: {
      title: 'Votre page peut aller plus loin.',
      body: `Avec Essentiel, ajoutez jusqu'à ${PLANS.essential.maxCustomSections} blocs de contenu par page : bannières, textes, images, questions fréquentes…`,
    },
    pro: {
      title: 'Votre page peut aller encore plus loin.',
      body: 'Avec Pro, composez vos pages avec autant de blocs de contenu que vous voulez.',
    },
  }),
  'builder-styles': () => ({
    plan: 'essential',
    title: 'Donnez un autre style à votre boutique.',
    body: 'Avec Essentiel, explorez tous les styles et le builder complet pour composer votre site exactement comme vous l’imaginez.',
    cta: activate('essential'),
  }),
  branding: () => ({
    plan: 'pro',
    title: 'Votre boutique, à votre nom.',
    body: 'Avec Pro, retirez la mention « Propulsé par Bitiko » de votre boutique et de vos documents.',
    cta: activate('pro'),
  }),
  'finance-history': (current) => {
    const plan: PaidPlanKey = current === 'essential' ? 'pro' : 'essential'
    return {
      plan,
      title: 'Regardez plus loin dans votre activité.',
      body:
        plan === 'essential'
          ? `Avec Essentiel, retrouvez jusqu'à ${PLANS.essential.financeHistoryMonths} mois d'historique dans votre bilan.`
          : 'Avec Pro, retrouvez tout l’historique de votre activité dans votre bilan.',
      cta: activate(plan),
    }
  },
  'finance-comparison': () => ({
    plan: 'pro',
    title: 'Comparez vos performances dans le temps.',
    body: 'Avec Pro, comparez chaque période à la précédente et suivez votre progression sur l’année.',
    cta: activate('pro'),
  }),
  'finance-entries': () => ({
    plan: 'essential',
    title: 'Vos comptes s’étoffent.',
    body: 'Avec Essentiel, notez autant de dépenses et de recettes que nécessaire, sans plafond mensuel.',
    cta: continueWith('essential'),
  }),
  tontines: quota({
    essential: {
      title: 'Vos clients épargnent pour plusieurs occasions ?',
      body: `Avec Essentiel, menez jusqu'à ${PLANS.essential.maxActiveTontines} tontines en même temps (Tabaski, rentrée, fêtes…).`,
    },
    pro: {
      title: 'Vos tontines se multiplient.',
      body: 'Avec Pro, menez autant de tontines que vous le souhaitez.',
    },
  }),
  'tontine-members': quota({
    essential: {
      title: 'Votre tontine attire du monde.',
      body: `Avec Essentiel, accueillez jusqu'à ${PLANS.essential.maxTontineMembers} membres par tontine.`,
    },
    pro: {
      title: 'Votre tontine attire encore plus de monde.',
      body: 'Avec Pro, accueillez autant de membres que vous le souhaitez.',
    },
  }),
  'category-tiles': () => ({
    plan: 'essential',
    title: 'Donnez du caractère à vos catégories.',
    body: 'Avec Essentiel, choisissez la couleur et l’image de chaque catégorie pour une boutique qui vous ressemble.',
    cta: activate('essential'),
  }),
  seo: () => ({
    plan: 'essential',
    title: 'Aidez vos clients à vous trouver.',
    body: 'Avec Essentiel, choisissez le titre, la description et l’image de partage de chacune de vos pages, et décidez lesquelles apparaissent sur Google.',
    cta: activate('essential'),
  }),
  analytics: () => ({
    plan: 'essential',
    title: 'Comprenez ce qui se vend vraiment.',
    body: 'Avec Essentiel, suivez le panier moyen, vos produits les plus vendus et les tendances de vos ventes.',
    cta: activate('essential'),
  }),
}

export function getUpgradeMoment(key: UpgradeMomentKey, current: PlanKey): UpgradeMoment {
  return BUILDERS[key](current)
}
