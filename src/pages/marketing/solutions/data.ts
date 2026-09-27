// Import relatif : ce fichier est aussi lu par api/ (aperçus de partage, sitemap), qui n'a pas l'alias `@/`.
import { PLANS } from '../../../config/plans.js'

export interface SolutionShot {
  name: string
  alt: string
  kind: 'browser' | 'phone'
}

export interface SolutionPageData {
  slug: string
  /** Libellé court (menu, pied de page, cartes). */
  navLabel: string
  /** Balises <title> et description : uniques par page, sous 60 / 155 caractères. */
  metaTitle: string
  metaDescription: string
  eyebrow: string
  h1: string
  lead: string
  /** Public visé (données structurées). */
  audience: string
  benefits: { title: string; text: string }[]
  steps: { title: string; text: string }[]
  features: string[]
  shots: SolutionShot[]
  faq: { question: string; answer: string }[]
  related: string[]
}

const free = PLANS.free

export const SOLUTION_PAGES: SolutionPageData[] = [
  {
    slug: 'boutique-en-ligne',
    navLabel: 'Boutique en ligne',
    metaTitle: 'Créer une boutique en ligne en Afrique de l’Ouest | Bitiko',
    metaDescription:
      'Créez votre boutique en ligne en 2 minutes : catalogue, panier, livraison par quartier, paiement en espèces ou mobile money, commandes sur WhatsApp. Gratuit, sans commission.',
    eyebrow: 'Boutique en ligne',
    h1: 'Créez votre boutique en ligne et vendez 24 h sur 24, sans commission',
    lead:
      'Bitiko donne à votre commerce un vrai site : catalogue avec photos, panier, livraison par quartier, paiement en espèces ou en mobile money. Chaque commande vous arrive prête à confirmer sur WhatsApp. Aucun code, aucune carte bancaire pour commencer.',
    audience: 'Commerçants et vendeurs en ligne d’Afrique de l’Ouest',
    benefits: [
      { title: 'Un lien à partager partout', text: 'Votre boutique a sa propre adresse (votre-nom.bitiko.shop). Collez-la dans votre bio Instagram, vos statuts WhatsApp ou vos annonces : vos clients voient tout le catalogue au lieu de vous demander les prix en message privé.' },
      { title: 'Des commandes propres, pas des captures d’écran', text: 'Nom, articles, quantités, total, quartier de livraison et mode de paiement : la commande arrive complète et numérotée. Fini les erreurs de calcul et les oublis.' },
      { title: 'Un stock qui suit vos ventes', text: 'Chaque commande décrémente le stock. Vous êtes alerté avant la rupture et un produit épuisé n’est plus commandable : plus de vente en double.' },
      { title: 'Livraison et paiement comme chez vous', text: 'Zones de livraison avec leurs tarifs, livraison offerte au-delà d’un montant, paiement à la livraison ou par Wave et Orange Money. Vous encaissez comme d’habitude, sans intermédiaire.' },
    ],
    steps: [
      { title: 'Décrivez votre activité', text: 'Nom, pays, numéro WhatsApp : Bitiko vous propose un modèle de boutique adapté à votre métier.' },
      { title: 'Ajoutez vos produits', text: 'Un par un avec photos, prix et stock, ou d’un coup grâce à l’import CSV.' },
      { title: 'Partagez votre lien', text: 'Vos clients commandent seuls, vous confirmez d’un clic depuis votre téléphone.' },
    ],
    features: [
      'Catalogue avec photos, catégories, variantes (taille, couleur) et badges « Nouveau » ou « Promo »',
      'Panier et commande en quelques touches, pensés pour le téléphone',
      'Zones et tarifs de livraison par quartier ou par ville',
      'Espèces à la livraison ou mobile money (Wave, Orange Money)',
      'Suivi des commandes : en attente, confirmée, payée, livrée',
      'Fichier clients automatique avec relance en un clic sur WhatsApp',
    ],
    shots: [
      { name: 'shop-boutique', alt: 'Boutique de mode créée avec Bitiko sur téléphone', kind: 'phone' },
      { name: 'shop-produits', alt: 'Liste des produits avec stock et prix dans Bitiko', kind: 'browser' },
      { name: 'shop-commandes', alt: 'Suivi des commandes par statut dans Bitiko', kind: 'browser' },
    ],
    faq: [
      { question: 'Combien coûte une boutique en ligne avec Bitiko ?', answer: `Le plan Découverte est gratuit, sans carte bancaire : ${free.maxActiveProducts} produits actifs, la livraison par zones et le suivi des commandes. Essentiel (3 000 F par mois) et Pro (10 000 F par mois) ajoutent plus de produits et des outils avancés. Bitiko ne prend aucune commission sur vos ventes.` },
      { question: 'Mes clients doivent-ils créer un compte pour commander ?', answer: 'Non. Ils choisissent leurs articles, indiquent leur nom, leur téléphone et leur adresse, puis valident. Vous recevez la commande immédiatement.' },
      { question: 'Comment mes clients paient-ils ?', answer: 'En espèces à la livraison ou par mobile money (Wave, Orange Money). Vous confirmez le paiement avec eux directement, sans plateforme de paiement à configurer.' },
      { question: 'Puis-je importer mon catalogue existant ?', answer: 'Oui : un fichier CSV (nom, description, prix, stock, catégorie) suffit pour charger tous vos produits d’un coup.' },
    ],
    related: ['mode-artisanat', 'finances-commercants', 'restaurant'],
  },
  {
    slug: 'salon-coiffure-beaute',
    navLabel: 'Salon de coiffure et beauté',
    metaTitle: 'Prise de rendez-vous en ligne pour salon de coiffure | Bitiko',
    metaDescription:
      'Logiciel de rendez-vous pour salon de coiffure, institut de beauté et barbier : horaires différents chaque jour, pauses, équipe, rappels. Vos clients réservent seuls. Gratuit pour démarrer.',
    eyebrow: 'Coiffure, beauté et bien-être',
    h1: 'Remplissez l’agenda de votre salon sans répondre à chaque message',
    lead:
      'Vos clientes réservent un créneau libre depuis leur téléphone, à toute heure. Vous voyez la demande dans votre agenda, vous confirmez d’un clic et vous prévenez la cliente sur WhatsApp. Vos horaires, vos pauses et votre équipe sont déjà pris en compte.',
    audience: 'Salons de coiffure, instituts de beauté, barbiers et spas',
    benefits: [
      { title: 'Vos vrais horaires, jour par jour', text: 'Ouvert le samedi jusqu’à 17 h, fermé le dimanche, pause de 13 h à 15 h en semaine ? Réglez chaque journée séparément, ajoutez vos congés : la cliente ne voit que des créneaux réellement libres.' },
      { title: 'Zéro double réservation', text: 'Un créneau pris est aussitôt bloqué, y compris pour la personne de l’équipe choisie. Plus de rendez-vous oubliés ou superposés dans un carnet.' },
      { title: 'Vous êtes prévenu tout de suite', text: 'Chaque nouvelle demande vous arrive formatée sur votre WhatsApp et dans votre agenda, avec les boutons Appeler et WhatsApp pour répondre en un geste.' },
      { title: 'Vos prestations et vos prix en ligne', text: 'Coupe, tresses, soin du visage, manucure : nom, durée et tarif. La cliente sait ce qu’elle réserve et combien cela coûte avant de venir.' },
    ],
    steps: [
      { title: 'Listez vos prestations', text: 'Nom, durée et tarif de chaque soin ou coupe, avec l’équipe qui les réalise.' },
      { title: 'Réglez vos horaires', text: 'Jours d’ouverture, pauses, congés : Bitiko en déduit les créneaux disponibles.' },
      { title: 'Partagez votre lien', text: 'Instagram, WhatsApp, carte de visite : vos clientes réservent en ligne.' },
    ],
    features: [
      'Horaires différents chaque jour, avec pauses et jours de congé',
      'Agenda jour et semaine, demandes à confirmer mises en évidence',
      'Équipe : chaque rendez-vous attribué à une personne, spécialités affichées',
      'Boutons Appeler et WhatsApp sur chaque rendez-vous',
      'Alerte WhatsApp à chaque nouvelle demande',
      'Vente de produits en complément (soins, cosmétiques) dans le même espace',
    ],
    shots: [
      { name: 'reserver', alt: 'Choix d’un créneau de rendez-vous sur le site d’un salon', kind: 'phone' },
      { name: 'agenda', alt: 'Agenda des rendez-vous du salon avec demandes à confirmer', kind: 'browser' },
      { name: 'horaires', alt: 'Réglage des horaires du salon jour par jour', kind: 'browser' },
    ],
    faq: [
      { question: 'Mes clientes doivent-elles installer une application ?', answer: 'Non. Elles réservent depuis le navigateur de leur téléphone, sur votre lien. Rien à télécharger, aucun compte à créer.' },
      { question: 'Puis-je avoir des horaires différents selon les jours ?', answer: 'Oui. Vous réglez chaque jour séparément (plusieurs plages possibles pour une pause) et vous marquez vos jours de congé.' },
      { question: 'Comment suis-je prévenu d’une nouvelle réservation ?', answer: 'Sur votre WhatsApp, formaté, et dans votre agenda Bitiko. Vous confirmez ou refusez d’un clic, puis vous répondez à la cliente par téléphone ou WhatsApp depuis la même fiche.' },
      { question: 'Combien de prestations et de rendez-vous en ligne sur le plan gratuit ?', answer: `Le plan Découverte inclut ${free.maxActiveServices} prestations actives, ${free.maxTeamMembers} personnes d’équipe et ${free.maxMonthlyBookings} demandes de rendez-vous par mois. Les plans payants augmentent ces limites.` },
    ],
    related: ['prestataires-services', 'restaurant', 'finances-commercants'],
  },
  {
    slug: 'restaurant',
    navLabel: 'Restaurant et livraison',
    metaTitle: 'Réservation de table et commande en ligne restaurant | Bitiko',
    metaDescription:
      'Restaurants et cafés : carte en ligne, réservation de tables, commande à emporter et livraison par quartier, commandes sur WhatsApp. Sans commission, gratuit pour démarrer.',
    eyebrow: 'Restauration et livraison',
    h1: 'Votre carte, vos réservations de table et vos commandes au même endroit',
    lead:
      'Montrez votre carte, laissez vos clients réserver une table pour le soir et commander à emporter ou en livraison. Les commandes arrivent sur votre WhatsApp, les réservations dans votre tableau de bord, sans commission sur vos ventes.',
    audience: 'Restaurants, cafés, traiteurs et vendeurs de repas',
    benefits: [
      { title: 'Une carte toujours à jour', text: 'Plats, prix, photos et disponibilité : vous modifiez la carte en quelques secondes et vos clients la voient partout, sans PDF à renvoyer.' },
      { title: 'Des tables réservées, un service préparé', text: 'Vous fixez la capacité de la salle et la durée d’un repas. Le client choisit le jour, l’heure et le nombre de couverts ; vous voyez votre service du soir d’un coup d’œil.' },
      { title: 'Commande et livraison par quartier', text: 'Le client choisit son quartier, le tarif de livraison s’applique et la commande arrive formatée sur WhatsApp : plus besoin de noter à la main pendant le coup de feu.' },
      { title: 'Vos chiffres du mois', text: 'Recettes, dépenses, bénéfice : un bilan simple, téléchargeable en PDF ou Excel pour votre comptable.' },
    ],
    steps: [
      { title: 'Créez votre carte', text: 'Ajoutez vos plats et boissons avec leurs prix.' },
      { title: 'Réglez vos horaires et vos tables', text: 'Jours d’ouverture, services midi et soir, capacité de la salle.' },
      { title: 'Partagez votre lien', text: 'Sur vos réseaux, à l’entrée, sur vos sacs : vos clients réservent et commandent en ligne.' },
    ],
    features: [
      'Carte en ligne avec catégories, photos et prix',
      'Réservation de table : capacité, durée d’un repas, nombre de couverts',
      'Commande à emporter ou en livraison avec zones et tarifs',
      'Commande formatée envoyée sur WhatsApp',
      'Paiement en espèces ou par mobile money',
      'Bilan de gestion simple avec export PDF et Excel',
    ],
    shots: [
      { name: 'horaires', alt: 'Réglage des horaires d’ouverture jour par jour', kind: 'browser' },
      { name: 'shop-commandes', alt: 'Suivi des commandes et de leur statut', kind: 'browser' },
      { name: 'dashboard', alt: 'Tableau de bord avec le service du jour', kind: 'browser' },
    ],
    faq: [
      { question: 'Bitiko prend-il une commission sur mes commandes ?', answer: 'Non, jamais. Vous gardez 100 % du prix de vos plats. Vous ne payez que l’abonnement si vous choisissez un plan payant.' },
      { question: 'Puis-je limiter le nombre de couverts par service ?', answer: 'Oui : vous indiquez la capacité de votre salle et la durée moyenne d’un repas. Bitiko n’accepte que les réservations qui rentrent.' },
      { question: 'Comment les commandes arrivent-elles ?', answer: 'Sur votre WhatsApp avec le nom du client, les plats, le total et le quartier de livraison, et dans votre tableau de bord. Les réservations de table arrivent aussi sur votre WhatsApp, formatées.' },
      { question: 'Le client peut-il payer en ligne ?', answer: 'Le client choisit espèces à la livraison ou mobile money ; vous confirmez le paiement avec lui sur WhatsApp. Aucune plateforme de paiement compliquée à configurer.' },
    ],
    related: ['boutique-en-ligne', 'salon-coiffure-beaute', 'finances-commercants'],
  },
  {
    slug: 'mode-artisanat',
    navLabel: 'Mode, artisanat et décoration',
    metaTitle: 'Vendre vêtements, wax et artisanat en ligne | Bitiko',
    metaDescription:
      'Boutique en ligne pour la mode, le wax, les bijoux, l’artisanat et la décoration : photos, tailles, stock, commandes sur WhatsApp, livraison par quartier. Sans commission.',
    eyebrow: 'Mode, artisanat et décoration',
    h1: 'Une vitrine à la hauteur de vos créations, et des commandes sans messages en boucle',
    lead:
      'Robes, ensembles bazin, bijoux, sacs en pagne, pièces uniques : chaque article a ses photos, ses tailles, son prix et son stock. Vos clientes commandent seules et vous n’avez plus à répondre dix fois aux mêmes questions.',
    audience: 'Créateurs, couturiers, boutiques de mode, artisans et décorateurs',
    benefits: [
      { title: 'Des fiches produit qui donnent envie', text: 'Plusieurs photos par article, description, tailles et couleurs en variantes, pastille « Nouveau » ou « Promo » : votre catalogue ressemble à votre marque.' },
      { title: 'Chaque pièce garde son stock', text: 'Pour une pièce unique ou une série limitée, le stock tombe à zéro à la vente et le produit n’est plus commandable. Plus jamais deux clientes pour le même article.' },
      { title: 'Une vitrine personnalisable sans développeur', text: 'Modèle mode ou artisanat, couleurs, typographie, sections : vous ajustez l’apparence avec un éditeur visuel et vous voyez le résultat sur mobile avant de publier.' },
      { title: 'Vos clientes fidèles retrouvées', text: 'Chaque commande crée une fiche cliente. Vous retrouvez vos meilleures clientes et vous les relancez sur WhatsApp pour une nouvelle collection.' },
    ],
    steps: [
      { title: 'Photographiez vos pièces', text: 'Ajoutez photos, prix, tailles et stock de chaque article.' },
      { title: 'Choisissez votre modèle', text: 'Mode, artisanat, maison : un style de départ que vous personnalisez.' },
      { title: 'Vendez partout', text: 'Partagez le lien sur Instagram, TikTok, Facebook et WhatsApp.' },
    ],
    features: [
      'Photos multiples, variantes de taille et de couleur, champs de précision (prénom à broder, ton…)',
      'Stock par article et par variante, alertes de stock bas et de rupture',
      'Modèles de vitrine pour la mode, l’artisanat et la décoration',
      'Éditeur visuel avec aperçu mobile avant publication',
      'Promotions, pastilles et mise en avant de produits',
      'Livraison par zones, paiement en espèces ou mobile money',
    ],
    shots: [
      { name: 'shop-catalogue', alt: 'Catalogue de vêtements et accessoires sur téléphone', kind: 'phone' },
      { name: 'shop-produit', alt: 'Fiche produit avec photo et bouton Ajouter', kind: 'phone' },
      { name: 'shop-personnaliser', alt: 'Éditeur visuel de la vitrine avec aperçu en direct', kind: 'browser' },
    ],
    faq: [
      { question: 'Puis-je proposer plusieurs tailles et couleurs pour un même modèle ?', answer: 'Oui, grâce aux variantes : chaque taille ou couleur peut avoir son propre stock, son prix et sa photo.' },
      { question: 'Comment vendre des pièces uniques ?', answer: 'Créez le produit avec un stock de 1. Dès qu’il est commandé, il n’est plus disponible : vous ne pouvez pas le vendre deux fois.' },
      { question: 'Puis-je proposer des pièces sur mesure ?', answer: 'Oui, avec les champs de précision : le client indique sa taille, sa couleur ou un prénom à broder avant de commander, et l’information arrive dans la commande.' },
      { question: 'Ai-je besoin de compétences techniques ?', answer: 'Non. Si vous savez envoyer une photo sur WhatsApp, vous savez utiliser Bitiko : tout se fait depuis votre téléphone.' },
    ],
    related: ['boutique-en-ligne', 'finances-commercants', 'prestataires-services'],
  },
  {
    slug: 'prestataires-services',
    navLabel: 'Prestataires de services',
    metaTitle: 'Rendez-vous en ligne pour prestataires de services | Bitiko',
    metaDescription:
      'Réparateurs, coachs, photographes, artisans du service : prestations, tarifs, créneaux et agenda en ligne. Vos clients réservent seuls, vous confirmez d’un clic. Gratuit pour démarrer.',
    eyebrow: 'Prestataires et indépendants',
    h1: 'Présentez vos prestations, laissez vos clients réserver, gagnez du temps',
    lead:
      'Réparateur, coach, photographe, plombier, formateur : listez vos prestations avec leur durée et leur tarif, réglez vos disponibilités et laissez vos clients choisir un créneau. Vous confirmez, vous êtes payé, sans échanges interminables.',
    audience: 'Indépendants et prestataires de services',
    benefits: [
      { title: 'Une vitrine sérieuse en quelques minutes', text: 'Vos prestations, vos tarifs, votre équipe et vos coordonnées sur une page propre qui rassure avant le premier contact.' },
      { title: 'Des créneaux qui respectent votre emploi du temps', text: 'Vous indiquez quand vous travaillez ; les clients ne peuvent réserver que dans ces plages, jamais en dehors.' },
      { title: 'Un agenda clair pour toute la semaine', text: 'Vos rendez-vous du jour et des prochains jours au même endroit, avec les demandes à confirmer en évidence.' },
      { title: 'Le prix figé à la réservation', text: 'Le tarif affiché au moment de la demande est conservé : pas de litige si vous modifiez vos prix plus tard.' },
    ],
    steps: [
      { title: 'Décrivez vos prestations', text: 'Nom, durée, tarif et description de chaque service.' },
      { title: 'Indiquez vos disponibilités', text: 'Horaires par jour, pauses, congés.' },
      { title: 'Recevez des demandes', text: 'Confirmez ou refusez d’un clic, puis prévenez le client.' },
    ],
    features: [
      'Prestations avec durée, tarif, description et catégorie',
      'Disponibilités jour par jour, pauses et congés',
      'Agenda avec demandes à confirmer et statuts (confirmé, terminé, annulé)',
      'Équipe et attribution des rendez-vous',
      'Notification WhatsApp à chaque demande',
      'Recettes des rendez-vous terminés reprises automatiquement dans votre bilan',
    ],
    shots: [
      { name: 'prestations', alt: 'Liste des prestations avec durée, prix et visibilité', kind: 'browser' },
      { name: 'agenda', alt: 'Agenda avec les rendez-vous du jour', kind: 'browser' },
      { name: 'equipe', alt: 'Équipe présentée avec ses spécialités', kind: 'browser' },
    ],
    faq: [
      { question: 'Puis-je travailler seul et avoir quand même un agenda ?', answer: 'Oui. Vous pouvez utiliser Bitiko en indépendant : vos prestations, vos horaires et votre agenda suffisent. L’équipe est facultative.' },
      { question: 'Comment mes clients choisissent-ils un créneau ?', answer: 'Ils sélectionnent une prestation, un jour, puis un horaire disponible, et laissent leur nom et leur numéro. Vous recevez la demande et vous la confirmez.' },
      { question: 'Puis-je proposer des devis ?', answer: 'Vous pouvez présenter vos prestations avec leur tarif de base et échanger ensuite avec le client par téléphone ou WhatsApp pour préciser l’intervention.' },
      { question: 'Bitiko suit-il mes revenus ?', answer: 'Oui : les rendez-vous marqués comme terminés sont comptés dans votre bilan, avec vos dépenses saisies. Vous obtenez un résultat simple, exportable en PDF ou Excel.' },
    ],
    related: ['salon-coiffure-beaute', 'finances-commercants', 'boutique-en-ligne'],
  },
  {
    slug: 'finances-commercants',
    navLabel: 'Finances et bilan simple',
    metaTitle: 'Bilan simple et suivi des finances pour petit commerce | Bitiko',
    metaDescription:
      'Suivez vos recettes, vos dépenses et votre bénéfice sans jargon. Ventes et rendez-vous comptés automatiquement, bilan PDF et Excel gratuit. Pensé pour les petits commerces.',
    eyebrow: 'Finances et gestion',
    h1: 'Savoir enfin ce que vous gagnez vraiment, sans faire de comptabilité',
    lead:
      'Bitiko compte vos recettes tout seul (commandes payées, rendez-vous terminés), vous ajoutez vos dépenses en quelques champs, et vous voyez votre bénéfice, votre marge et où part votre argent. Un bilan à télécharger en PDF ou en Excel, sur tous les plans.',
    audience: 'Petits commerces et indépendants sans logiciel de comptabilité',
    benefits: [
      { title: 'Vos recettes comptées automatiquement', text: 'Les commandes payées ou livrées et les rendez-vous terminés alimentent votre bilan sans ressaisie. Vous n’ajoutez que ce que Bitiko ne voit pas : ventes au comptoir et dépenses.' },
      { title: 'Vos dépenses en 6 champs', text: 'Date, catégorie, libellé, montant, moyen de paiement, note. Loyer, stock, salaires, transport : des catégories simples, pas un plan comptable.' },
      { title: 'Un résultat lisible', text: 'Recettes, dépenses, bénéfice ou perte, marge, évolution mois par mois et ce qui rapporte le plus : produits et prestations classés.' },
      { title: 'Un bilan à donner à votre comptable', text: 'Une page A4 sobre à enregistrer en PDF, et un export Excel (CSV). Générés sur votre appareil, gratuits sur tous les plans.' },
    ],
    steps: [
      { title: 'Vendez ou réservez', text: 'Vos commandes payées et rendez-vous terminés sont comptés automatiquement.' },
      { title: 'Notez vos dépenses', text: 'En quelques secondes, quand elles ont lieu.' },
      { title: 'Consultez votre bilan', text: 'Chaque mois, ou sur le trimestre et l’année selon votre plan.' },
    ],
    features: [
      'Recettes automatiques (ventes en ligne, prestations terminées) plus recettes saisies',
      'Journal de dépenses par catégorie avec moyen de paiement',
      'Bénéfice, marge et graphique mois par mois',
      'Classement des produits et prestations qui rapportent le plus',
      'Bilan PDF imprimable et export Excel (CSV) inclus dans tous les plans',
      'Comparaison avec la période précédente en plan Pro',
    ],
    shots: [
      { name: 'shop-finances', alt: 'Écran Finances : recettes, dépenses et bénéfice du mois', kind: 'browser' },
      { name: 'bilan-pdf', alt: 'Bilan de gestion imprimable', kind: 'browser' },
      { name: 'dashboard', alt: 'Tableau de bord de l’activité', kind: 'browser' },
    ],
    faq: [
      { question: 'Est-ce une comptabilité officielle ?', answer: 'Non. C’est un bilan de gestion pour piloter votre activité. Il ne remplace ni une comptabilité légale ni une déclaration fiscale ; votre comptable peut s’en servir comme base.' },
      { question: 'Le bilan PDF et l’export Excel sont-ils payants ?', answer: 'Non, ils sont inclus dans tous les plans, y compris gratuit. Ils sont générés sur votre appareil, sans coût pour vous.' },
      { question: 'Qui voit mes finances ?', answer: 'Le propriétaire de la boutique et ses managers. Les vendeurs de votre équipe n’y ont pas accès.' },
      { question: 'Quelle différence entre les plans ?', answer: `Le plan gratuit affiche le mois en cours avec ${free.maxMonthlyFinanceEntries} saisies par mois. Essentiel donne 12 mois d’historique et des saisies illimitées ; Pro ajoute la comparaison entre périodes et un historique complet.` },
    ],
    related: ['boutique-en-ligne', 'salon-coiffure-beaute', 'restaurant'],
  },
]

export const SOLUTION_BY_SLUG: Record<string, SolutionPageData> = Object.fromEntries(SOLUTION_PAGES.map((p) => [p.slug, p]))
