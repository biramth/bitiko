import {
  BarChart3,
  CalendarClock,
  CreditCard,
  LineChart,
  MapPinned,
  MessageCircleMore,
  Package,
  Palette,
  Smartphone,
  Store,
  Tag,
  UserRound,
  Users,
  UtensilsCrossed,
  Wallet,
  Wand2,
  type LucideIcon,
} from 'lucide-react'

export interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

export interface FeatureGroup {
  id: string
  eyebrow: string
  title: string
  description: string
  features: Feature[]
}

/** Les fonctionnalités, regroupées par job à faire : vendre, réserver, piloter. */
export const featureGroups: FeatureGroup[] = [
  {
    id: 'vendre',
    eyebrow: 'Vendre',
    title: 'Une boutique qui vend pendant que tu dors.',
    description: 'Catalogue, panier, livraison, paiement : tout ce qu\'il faut pour transformer une visite en commande.',
    features: [
      {
        icon: Store,
        title: 'Catalogue & stock en temps réel',
        description: 'Photos, prix, variantes, catégories. La commande passe, le stock baisse, et tu es alerté avant la rupture.',
      },
      {
        icon: Wand2,
        title: 'Une vitrine à tes couleurs',
        description: 'Des modèles pensés par métier et un éditeur visuel : couleurs, bannière, mise en page. Aucune compétence technique.',
      },
      {
        icon: MapPinned,
        title: 'Livraison par zones',
        description: 'Centre-ville, banlieue, autres villes : tu fixes tes tarifs, le client choisit sa zone, le prix s\'applique. Livraison offerte au-dessus d\'un montant.',
      },
      {
        icon: CreditCard,
        title: 'Espèces ou mobile money',
        description: 'À la livraison, sur place ou par mobile money : le client paie comme il veut, tu confirmes sur WhatsApp. Zéro commission.',
      },
      {
        icon: MessageCircleMore,
        title: 'Commandes sur WhatsApp',
        description: 'Chaque commande t\'arrive formatée : nom, articles, total, adresse. Tu confirmes en un clic et tu réponds au client.',
      },
      {
        icon: Tag,
        title: 'Promotions & clients fidèles',
        description: 'Bannières promo, badges « Nouveau » et « Promo », fichier clients avec relance en un clic sur WhatsApp.',
      },
    ],
  },
  {
    id: 'reserver',
    eyebrow: 'Réserver',
    title: 'Un agenda qui se remplit sans messages en boucle.',
    description: 'Prestations, rendez-vous, tables : tes clients réservent seuls, sur des créneaux réellement libres.',
    features: [
      {
        icon: CalendarClock,
        title: 'Rendez-vous avec tes vrais horaires',
        description: 'Des horaires différents chaque jour, une pause déjeuner, des congés. Le client ne voit que les créneaux libres.',
      },
      {
        icon: UtensilsCrossed,
        title: 'Réservation de tables',
        description: 'Capacité de la salle, durée d\'un repas, nombre de couverts : ton service du soir en un coup d\'œil.',
      },
      {
        icon: Users,
        title: 'Équipe & prestations',
        description: 'Présente ton équipe, attribue les rendez-vous, règle tes tarifs et tes durées. Invite un manager ou un vendeur.',
      },
    ],
  },
  {
    id: 'piloter',
    eyebrow: 'Piloter',
    title: 'Tes chiffres, sans jargon et sans comptable.',
    description: 'Le tableau de bord te dit quoi faire maintenant. Les finances te disent où tu en es.',
    features: [
      {
        icon: LineChart,
        title: 'Finances & bilan simple',
        description: 'Recettes automatiques (commandes payées, rendez-vous terminés), dépenses en 6 champs, bénéfice et marge. Bilan PDF et Excel.',
      },
      {
        icon: BarChart3,
        title: 'Tableau de bord utile',
        description: 'Ventes du jour, commandes à traiter, stock à surveiller, rendez-vous à confirmer : une page, zéro carnet.',
      },
      {
        icon: Package,
        title: 'Stock & planning synchronisés',
        description: 'Zéro vente en double, zéro créneau doublé. Tout se met à jour tout seul, côté serveur, en une seconde.',
      },
    ],
  },
]

/** « Pensé pour la vraie vie » : ce qui distingue Bitiko d'un site e-commerce classique. */
export const realLife: Feature[] = [
  { icon: Smartphone, title: 'Tout se fait au téléphone', description: 'Tes clients commandent et réservent depuis leur mobile. Toi, tu gères depuis le tien : aucun ordinateur obligatoire.' },
  { icon: MessageCircleMore, title: 'WhatsApp au centre', description: 'Tu continues de parler à tes clients là où ils sont déjà. Bitiko range les commandes, WhatsApp garde la relation.' },
  { icon: Wallet, title: 'Tu encaisses comme d\'habitude', description: 'Espèces ou mobile money, sans intermédiaire de paiement à configurer. Aucune commission sur tes ventes, jamais.' },
  { icon: UserRound, title: 'Ton équipe, avec des droits', description: 'Invite un manager ou un vendeur. Les finances restent réservées au propriétaire et aux managers.' },
]

export interface Solution {
  icon: LucideIcon
  tint: string
  title: string
  description: string
  tags: string
  /** Page de solution détaillée vers laquelle renvoie la carte. */
  slug: string
}

export const solutions: Solution[] = [
  {
    icon: Palette,
    tint: 'bg-rose-500/[0.08] text-rose-600 ring-rose-600/15',
    title: 'Mode, artisanat & décoration',
    description: 'Chaque pièce a ses photos, son prix, sa taille et son stock. Ta vitrine te ressemble, tes clientes commandent sans te poser dix fois les mêmes questions.',
    tags: 'Vêtements • Bijoux • Sacs • Créations',
    slug: 'mode-artisanat',
  },
  {
    icon: UtensilsCrossed,
    tint: 'bg-orange-500/[0.08] text-orange-600 ring-orange-600/15',
    title: 'Restaurant, traiteur & livraison',
    description: 'Ta carte en ligne, la livraison par zone, la commande formatée sur WhatsApp. Et la réservation de tables pour le soir.',
    tags: 'Plats • À emporter • Livraison • Tables',
    slug: 'restaurant',
  },
  {
    icon: CalendarClock,
    tint: 'bg-sky-500/[0.08] text-sky-700 ring-sky-600/15',
    title: 'Coiffure, beauté & bien-être',
    description: 'Prestations, tarifs, rendez-vous avec tes vrais horaires, équipe. Ton salon se remplit sans que ton téléphone ne sonne, et tes produits se vendent en ligne.',
    tags: 'Prestations • Rendez-vous • Équipe • Produits',
    slug: 'salon-coiffure-beaute',
  },
  {
    icon: Wand2,
    tint: 'bg-lime-600/[0.08] text-lime-700 ring-lime-600/15',
    title: 'Réparation & prestataires',
    description: 'Tes interventions, tes tarifs, tes créneaux. Une vitrine sérieuse qui rassure et qui te fait gagner des clients.',
    tags: 'Interventions • Devis • Créneaux',
    slug: 'prestataires-services',
  },
  {
    icon: Store,
    tint: 'bg-teal-600/[0.08] text-teal-700 ring-teal-600/15',
    title: 'Épicerie, électronique & commerce',
    description: 'Ton rayon en ligne avec le stock à jour, la livraison par zone et des commandes propres. Produits et services dans le même espace.',
    tags: 'Produits • Stock • Livraison',
    slug: 'boutique-en-ligne',
  },
  {
    icon: LineChart,
    tint: 'bg-fuchsia-500/[0.08] text-fuchsia-700 ring-fuchsia-600/15',
    title: 'Suivre ses finances',
    description: 'Recettes comptées toutes seules, dépenses notées en quelques secondes, bénéfice du mois en un coup d\'œil. Bilan PDF et Excel inclus.',
    tags: 'Recettes • Dépenses • Bilan',
    slug: 'finances-commercants',
  },
]

export const shopCategories = [
  'Mode & textiles',
  'Épicerie',
  'Restauration & livraison',
  'Beauté & cosmétiques',
  'Coiffure & bien-être',
  'Artisanat & créations',
  'Électronique',
  'Décoration',
  'Librairie & papeterie',
  'Réparation',
]
