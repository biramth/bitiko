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
  /** Situations vécues par le public visé, avant Bitiko (« Tu te reconnais ? »). */
  problems: string[]
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
    metaTitle: 'Créer sa boutique en ligne gratuitement | Bitiko',
    metaDescription:
      'Crée ta boutique en ligne en 2 minutes : catalogue, panier, livraison par zone, espèces ou mobile money, commandes sur WhatsApp. Gratuit, sans commission.',
    eyebrow: 'Boutique en ligne',
    h1: 'Crée ta boutique en ligne et vends 24 h sur 24, sans commission',
    lead:
      'Bitiko donne à ton commerce un vrai site : catalogue avec photos, panier, livraison par zone, paiement en espèces ou en mobile money. Chaque commande t’arrive prête à confirmer sur WhatsApp. Aucun code, aucune carte bancaire pour commencer.',
    audience: 'Commerçants et vendeurs en ligne',
    problems: [
      'Tu envoies les mêmes photos et les mêmes prix à chaque client, un par un.',
      'Des commandes se perdent entre deux conversations, ou arrivent incomplètes.',
      'Tu vends un article que tu n’as plus, et tu dois t’excuser auprès du client.',
    ],
    benefits: [
      { title: 'Un lien à partager partout', text: 'Ta boutique a sa propre adresse (ton-nom.bitiko.shop). Colle-la dans ta bio Instagram, tes statuts WhatsApp ou tes annonces : tes clients voient tout le catalogue au lieu de te demander les prix en message privé.' },
      { title: 'Des commandes propres, pas des captures d’écran', text: 'Nom, articles, quantités, total, adresse de livraison et mode de paiement : la commande arrive complète et numérotée. Fini les erreurs de calcul et les oublis.' },
      { title: 'Un stock qui suit tes ventes', text: 'Chaque commande décrémente le stock. Tu es alerté avant la rupture et un produit épuisé n’est plus commandable : plus de vente en double.' },
      { title: 'Livraison et paiement comme d’habitude', text: 'Zones de livraison avec leurs tarifs, livraison offerte au-delà d’un montant, paiement à la livraison ou par mobile money. Tu encaisses comme avant, sans intermédiaire.' },
    ],
    steps: [
      { title: 'Décris ton activité', text: 'Nom, métier, numéro WhatsApp : Bitiko te prépare une boutique adaptée, déjà présentée.' },
      { title: 'Ajoute tes produits', text: 'Un par un avec photos, prix et stock, ou d’un coup grâce à l’import CSV.' },
      { title: 'Partage ton lien', text: 'Tes clients commandent seuls, tu confirmes d’un clic depuis ton téléphone.' },
    ],
    features: [
      'Catalogue avec photos, catégories, variantes (taille, couleur) et badges « Nouveau » ou « Promo »',
      'Panier et commande en quelques touches, pensés pour le téléphone',
      'Aucun compte à créer pour tes clients : nom, téléphone, adresse, c’est commandé',
      'Zones et tarifs de livraison, livraison offerte au-delà d’un montant',
      'Espèces à la livraison ou mobile money, sans commission',
      'Suivi des commandes : en attente, confirmée, payée, livrée',
      'Fichier clients automatique avec relance en un clic sur WhatsApp',
      'Import de ton catalogue en CSV et export de tes commandes en Excel',
    ],
    shots: [
      { name: 'shop-boutique', alt: 'Boutique de mode créée avec Bitiko sur téléphone', kind: 'phone' },
      { name: 'shop-produit', alt: 'Fiche produit avec photo, prix et bouton Ajouter', kind: 'phone' },
      { name: 'shop-produits', alt: 'Liste des produits avec stock et prix dans Bitiko', kind: 'browser' },
      { name: 'shop-commandes', alt: 'Suivi des commandes par statut dans Bitiko', kind: 'browser' },
    ],
    faq: [
      { question: 'Combien coûte une boutique en ligne avec Bitiko ?', answer: `Le plan Découverte est gratuit, sans limite de durée et sans carte bancaire : ${free.maxActiveProducts} produits actifs, la livraison par zones et le suivi des commandes. Essentiel (3 000 F par mois) et Pro (10 000 F par mois) ajoutent plus de produits et des outils avancés. Bitiko ne prend aucune commission sur tes ventes.` },
      { question: 'Mes clients doivent-ils créer un compte pour commander ?', answer: 'Non. Ils choisissent leurs articles, indiquent leur nom, leur téléphone et leur adresse, puis valident. Tu reçois la commande immédiatement, sur WhatsApp et dans ton tableau de bord.' },
      { question: 'Comment mes clients paient-ils ?', answer: 'En espèces à la livraison ou par mobile money. Tu confirmes le paiement avec eux directement, sans plateforme de paiement à configurer et sans frais prélevés au passage.' },
      { question: 'Puis-je importer mon catalogue existant ?', answer: 'Oui : un fichier CSV (nom, description, prix, stock, catégorie) suffit pour charger tous tes produits d’un coup.' },
      { question: 'Ma boutique sera-t-elle trouvée sur Google ?', answer: 'Oui. Chaque boutique est publiée sur sa propre adresse avec des pages produits indexables, et tu peux régler le titre, la description et l’image de partage de chaque page avec les plans payants.' },
    ],
    related: ['mode-artisanat', 'finances-commercants', 'restaurant'],
  },
  {
    slug: 'salon-coiffure-beaute',
    navLabel: 'Salon de coiffure et beauté',
    metaTitle: 'Prise de rendez-vous en ligne pour salon de coiffure | Bitiko',
    metaDescription:
      'Rendez-vous en ligne pour salon de coiffure, institut de beauté et barbier : horaires par jour, pauses, équipe, alertes WhatsApp. Gratuit pour démarrer.',
    eyebrow: 'Coiffure, beauté et bien-être',
    h1: 'Remplis l’agenda de ton salon sans répondre à chaque message',
    lead:
      'Tes clientes réservent un créneau libre depuis leur téléphone, à toute heure. La demande arrive dans ton agenda et sur ton WhatsApp, tu confirmes d’un clic. Tes horaires, tes pauses et ton équipe sont déjà pris en compte.',
    audience: 'Salons de coiffure, instituts de beauté, barbiers et spas',
    problems: [
      'Tu réponds « c’est combien ? » et « tu as de la place samedi ? » toute la journée, même le soir.',
      'Deux clientes arrivent pour le même créneau parce que le carnet n’était pas à jour.',
      'Une cliente oublie son rendez-vous et ta chaise reste vide.',
    ],
    benefits: [
      { title: 'Tes vrais horaires, jour par jour', text: 'Ouvert le samedi jusqu’à 17 h, fermé le dimanche, pause de 13 h à 15 h en semaine ? Règle chaque journée séparément, ajoute tes congés : la cliente ne voit que des créneaux réellement libres.' },
      { title: 'Zéro double réservation', text: 'Un créneau pris est aussitôt bloqué, y compris pour la personne de l’équipe choisie. Plus de rendez-vous oubliés ou superposés dans un carnet.' },
      { title: 'Tu es prévenu tout de suite', text: 'Chaque nouvelle demande t’arrive formatée sur ton WhatsApp et dans ton agenda, avec les boutons Appeler et WhatsApp pour répondre en un geste.' },
      { title: 'Tes prestations et tes prix en ligne', text: 'Coupe, tresses, soin du visage, manucure : nom, durée et tarif. La cliente sait ce qu’elle réserve et combien cela coûte avant de venir.' },
    ],
    steps: [
      { title: 'Liste tes prestations', text: 'Nom, durée et tarif de chaque soin ou coupe, avec l’équipe qui les réalise.' },
      { title: 'Règle tes horaires', text: 'Jours d’ouverture, pauses, congés : Bitiko en déduit les créneaux disponibles.' },
      { title: 'Partage ton lien', text: 'Instagram, WhatsApp, carte de visite : tes clientes réservent en ligne.' },
    ],
    features: [
      'Horaires différents chaque jour, avec pauses et jours de congé',
      'Agenda jour et semaine, demandes à confirmer mises en évidence',
      'Équipe : chaque rendez-vous attribué à une personne, spécialités affichées',
      'Boutons Appeler et WhatsApp sur chaque rendez-vous',
      'Alerte WhatsApp à chaque nouvelle demande',
      'Prix figé au moment de la réservation',
      'Vente de produits en complément (soins, cosmétiques) dans le même espace',
      'Recettes des rendez-vous terminés comptées automatiquement dans ton bilan',
    ],
    shots: [
      { name: 'boutique', alt: 'Site d’un institut de beauté créé avec Bitiko, sur téléphone', kind: 'phone' },
      { name: 'reserver', alt: 'Choix d’un créneau de rendez-vous sur le site d’un salon', kind: 'phone' },
      { name: 'agenda', alt: 'Agenda des rendez-vous du salon avec demandes à confirmer', kind: 'browser' },
      { name: 'horaires', alt: 'Réglage des horaires du salon jour par jour', kind: 'browser' },
    ],
    faq: [
      { question: 'Mes clientes doivent-elles installer une application ?', answer: 'Non. Elles réservent depuis le navigateur de leur téléphone, sur ton lien. Rien à télécharger, aucun compte à créer.' },
      { question: 'Puis-je avoir des horaires différents selon les jours ?', answer: 'Oui. Tu règles chaque jour séparément (plusieurs plages possibles pour une pause) et tu marques tes jours de congé.' },
      { question: 'Comment suis-je prévenu d’une nouvelle réservation ?', answer: 'Sur ton WhatsApp, formaté, et dans ton agenda Bitiko. Tu confirmes ou refuses d’un clic, puis tu réponds à la cliente par téléphone ou WhatsApp depuis la même fiche.' },
      { question: 'Mes clientes peuvent-elles choisir leur coiffeuse ou leur esthéticienne ?', answer: 'Oui. Tu présentes ton équipe avec ses spécialités ; la cliente choisit avec qui réserver, et le créneau est bloqué pour cette personne.' },
      { question: 'Combien de prestations et de rendez-vous en ligne sur le plan gratuit ?', answer: `Le plan Découverte inclut ${free.maxActiveServices} prestations actives, ${free.maxTeamMembers} personnes d’équipe et ${free.maxMonthlyBookings} demandes de rendez-vous par mois. Les plans payants augmentent ces limites.` },
    ],
    related: ['prestataires-services', 'boutique-en-ligne', 'finances-commercants'],
  },
  {
    slug: 'restaurant',
    navLabel: 'Restaurant et livraison',
    metaTitle: 'Réservation de table et commande en ligne restaurant | Bitiko',
    metaDescription:
      'Restaurants, cafés et traiteurs : carte en ligne, réservation de tables, commande à emporter et en livraison, commandes sur WhatsApp. Sans commission.',
    eyebrow: 'Restauration et livraison',
    h1: 'Ta carte, tes réservations de table et tes commandes au même endroit',
    lead:
      'Montre ta carte, laisse tes clients réserver une table pour le soir et commander à emporter ou en livraison. Les commandes arrivent sur ton WhatsApp, les réservations dans ton tableau de bord, sans commission sur tes ventes.',
    audience: 'Restaurants, cafés, traiteurs et vendeurs de repas',
    problems: [
      'Pendant le coup de feu, tu notes les commandes à la main entre deux appels.',
      'Ta carte en PDF n’est jamais à jour et tu la renvoies à chaque client.',
      'Les plateformes de livraison prennent une grosse part de chaque commande.',
    ],
    benefits: [
      { title: 'Une carte toujours à jour', text: 'Plats, prix, photos et disponibilité : tu modifies la carte en quelques secondes et tes clients la voient partout, sans PDF à renvoyer.' },
      { title: 'Des tables réservées, un service préparé', text: 'Tu fixes la capacité de la salle et la durée d’un repas. Le client choisit le jour, l’heure et le nombre de couverts ; tu vois ton service du soir d’un coup d’œil.' },
      { title: 'Commande et livraison par zone', text: 'Le client choisit sa zone, le tarif de livraison s’applique et la commande arrive formatée sur WhatsApp : plus besoin de noter à la main pendant le coup de feu.' },
      { title: '0 % de commission', text: 'Contrairement aux plateformes de livraison, Bitiko ne prélève rien sur tes commandes. Tu gardes 100 % du prix de tes plats.' },
    ],
    steps: [
      { title: 'Crée ta carte', text: 'Ajoute tes plats et tes boissons avec leurs prix et leurs photos.' },
      { title: 'Règle tes horaires et tes tables', text: 'Jours d’ouverture, services midi et soir, capacité de la salle.' },
      { title: 'Partage ton lien', text: 'Sur tes réseaux, à l’entrée, sur tes sacs : tes clients réservent et commandent en ligne.' },
    ],
    features: [
      'Carte en ligne avec catégories, photos et prix',
      'Réservation de table : capacité, durée d’un repas, nombre de couverts',
      'Commande à emporter ou en livraison avec zones et tarifs',
      'Commande formatée envoyée sur WhatsApp',
      'Paiement en espèces ou par mobile money',
      'Horaires par jour : service du midi, service du soir, jours de fermeture',
      'Bilan de gestion simple avec export PDF et Excel',
    ],
    shots: [
      { name: 'resto-carte', alt: 'Carte d’un restaurant créé avec Bitiko, sur téléphone : entrées et plats avec leurs prix', kind: 'phone' },
      { name: 'resto-table', alt: 'Réservation d’une table pour 4 personnes à 20 h 30, sur téléphone', kind: 'phone' },
      { name: 'resto-reservations', alt: 'Réservations de table du jour : couverts attendus, demandes à confirmer', kind: 'browser' },
      { name: 'resto-commandes', alt: 'Commandes à emporter et en livraison, avec leur statut', kind: 'browser' },
    ],
    faq: [
      { question: 'Bitiko prend-il une commission sur mes commandes ?', answer: 'Non, jamais. Tu gardes 100 % du prix de tes plats. Tu ne paies que l’abonnement si tu choisis un plan payant.' },
      { question: 'Puis-je limiter le nombre de couverts par service ?', answer: 'Oui : tu indiques la capacité de ta salle et la durée moyenne d’un repas. Bitiko n’accepte que les réservations qui rentrent.' },
      { question: 'Comment les commandes arrivent-elles ?', answer: 'Sur ton WhatsApp avec le nom du client, les plats, le total et l’adresse de livraison, et dans ton tableau de bord. Les réservations de table arrivent aussi sur ton WhatsApp, formatées.' },
      { question: 'Le client peut-il payer en ligne ?', answer: 'Le client choisit espèces à la livraison ou mobile money ; tu confirmes le paiement avec lui sur WhatsApp. Aucune plateforme de paiement compliquée à configurer.' },
    ],
    related: ['boutique-en-ligne', 'salon-coiffure-beaute', 'finances-commercants'],
  },
  {
    slug: 'mode-artisanat',
    navLabel: 'Mode, artisanat et décoration',
    metaTitle: 'Vendre ses vêtements et créations en ligne | Bitiko',
    metaDescription:
      'Boutique en ligne pour la mode, les bijoux, l’artisanat et la décoration : photos, tailles, stock, commandes sur WhatsApp, livraison par zone. Sans commission.',
    eyebrow: 'Mode, artisanat et décoration',
    h1: 'Une vitrine à la hauteur de tes créations, et des commandes sans messages en boucle',
    lead:
      'Robes, ensembles, bijoux, sacs, pièces uniques : chaque article a ses photos, ses tailles, son prix et son stock. Tes clientes commandent seules et tu n’as plus à répondre dix fois aux mêmes questions.',
    audience: 'Créateurs, couturiers, boutiques de mode, artisans et décorateurs',
    problems: [
      '« Il reste la taille M ? », « c’est combien ? » : les mêmes questions sous chaque publication.',
      'Deux clientes veulent la même pièce unique et tu dois en décevoir une.',
      'Ton talent mérite mieux qu’un album photo WhatsApp.',
    ],
    benefits: [
      { title: 'Des fiches produit qui donnent envie', text: 'Plusieurs photos par article, description, tailles et couleurs en variantes, pastille « Nouveau » ou « Promo » : ton catalogue ressemble à ta marque.' },
      { title: 'Chaque pièce garde son stock', text: 'Pour une pièce unique ou une série limitée, le stock tombe à zéro à la vente et le produit n’est plus commandable. Plus jamais deux clientes pour le même article.' },
      { title: 'Une vitrine personnalisable sans développeur', text: 'Modèle mode ou artisanat, palettes de couleurs en un clic, typographie, sections : tu ajustes l’apparence avec un éditeur visuel et tu vois le résultat sur mobile avant de publier.' },
      { title: 'Tes clientes fidèles retrouvées', text: 'Chaque commande crée une fiche cliente. Tu retrouves tes meilleures clientes et tu les relances sur WhatsApp pour une nouvelle collection.' },
    ],
    steps: [
      { title: 'Photographie tes pièces', text: 'Ajoute photos, prix, tailles et stock de chaque article.' },
      { title: 'Choisis ton style', text: 'Mode, artisanat, maison : un modèle de départ que tu personnalises.' },
      { title: 'Vends partout', text: 'Partage le lien sur Instagram, TikTok, Facebook et WhatsApp.' },
    ],
    features: [
      'Photos multiples, variantes de taille et de couleur, champs de précision (prénom à broder, mensurations…)',
      'Stock par article et par variante, alertes de stock bas et de rupture',
      'Modèles de vitrine pour la mode, l’artisanat et la décoration',
      'Éditeur visuel avec palettes en un clic et aperçu mobile avant publication',
      'Promotions, pastilles et mise en avant de produits',
      'Livraison par zones, paiement en espèces ou mobile money',
      'Fichier clientes et relance WhatsApp pour chaque nouvelle collection',
    ],
    shots: [
      { name: 'shop-catalogue', alt: 'Catalogue de vêtements et accessoires sur téléphone', kind: 'phone' },
      { name: 'shop-produit', alt: 'Fiche produit avec photo et bouton Ajouter', kind: 'phone' },
      { name: 'shop-personnaliser', alt: 'Éditeur visuel de la vitrine avec aperçu en direct', kind: 'browser' },
      { name: 'shop-clients', alt: 'Fichier clientes avec total dépensé et relance WhatsApp', kind: 'browser' },
    ],
    faq: [
      { question: 'Puis-je proposer plusieurs tailles et couleurs pour un même modèle ?', answer: 'Oui, grâce aux variantes : chaque taille ou couleur peut avoir son propre stock, son prix et sa photo.' },
      { question: 'Comment vendre des pièces uniques ?', answer: 'Crée le produit avec un stock de 1. Dès qu’il est commandé, il n’est plus disponible : tu ne peux pas le vendre deux fois.' },
      { question: 'Puis-je proposer du sur-mesure ?', answer: 'Oui, avec les champs de précision : la cliente indique sa taille, sa couleur ou un prénom à broder avant de commander, et l’information arrive dans la commande.' },
      { question: 'Ai-je besoin de compétences techniques ?', answer: 'Non. Si tu sais envoyer une photo sur WhatsApp, tu sais utiliser Bitiko : tout se fait depuis ton téléphone.' },
    ],
    related: ['boutique-en-ligne', 'finances-commercants', 'salon-coiffure-beaute'],
  },
  {
    slug: 'prestataires-services',
    navLabel: 'Prestataires de services',
    metaTitle: 'Rendez-vous en ligne pour prestataires de services | Bitiko',
    metaDescription:
      'Réparateurs, coachs, photographes, artisans : prestations, tarifs, créneaux et agenda en ligne. Tes clients réservent seuls, tu confirmes d’un clic. Gratuit.',
    eyebrow: 'Prestataires et indépendants',
    h1: 'Présente tes prestations, laisse tes clients réserver, gagne du temps',
    lead:
      'Réparateur, coach, photographe, plombier, formateur : liste tes prestations avec leur durée et leur tarif, règle tes disponibilités et laisse tes clients choisir un créneau. Tu confirmes d’un clic, sans échanges interminables.',
    audience: 'Indépendants et prestataires de services',
    problems: [
      'Tu passes plus de temps à caler des rendez-vous qu’à travailler.',
      'Sans site, les nouveaux clients hésitent à te faire confiance.',
      'Tu ne sais pas vraiment ce que tes interventions t’ont rapporté ce mois-ci.',
    ],
    benefits: [
      { title: 'Une vitrine sérieuse en quelques minutes', text: 'Tes prestations, tes tarifs, ton équipe et tes coordonnées sur une page propre qui rassure avant le premier contact.' },
      { title: 'Des créneaux qui respectent ton emploi du temps', text: 'Tu indiques quand tu travailles ; les clients ne peuvent réserver que dans ces plages, jamais en dehors.' },
      { title: 'Un agenda clair pour toute la semaine', text: 'Tes rendez-vous du jour et des prochains jours au même endroit, avec les demandes à confirmer en évidence.' },
      { title: 'Le prix figé à la réservation', text: 'Le tarif affiché au moment de la demande est conservé : pas de malentendu si tu modifies tes prix plus tard.' },
    ],
    steps: [
      { title: 'Décris tes prestations', text: 'Nom, durée, tarif et description de chaque service.' },
      { title: 'Indique tes disponibilités', text: 'Horaires par jour, pauses, congés.' },
      { title: 'Reçois des demandes', text: 'Confirme ou refuse d’un clic, puis préviens le client.' },
    ],
    features: [
      'Prestations avec durée, tarif, description et catégorie',
      'Disponibilités jour par jour, pauses et congés',
      'Agenda avec demandes à confirmer et statuts (confirmé, terminé, annulé)',
      'Équipe et attribution des rendez-vous',
      'Notification WhatsApp à chaque demande',
      'Recettes des rendez-vous terminés reprises automatiquement dans ton bilan',
    ],
    shots: [
      { name: 'reserver', alt: 'Choix d’un créneau sur téléphone', kind: 'phone' },
      { name: 'agenda-mobile', alt: 'Agenda du prestataire sur téléphone', kind: 'phone' },
      { name: 'prestations', alt: 'Liste des prestations avec durée, prix et visibilité', kind: 'browser' },
      { name: 'agenda', alt: 'Agenda avec les rendez-vous du jour', kind: 'browser' },
    ],
    faq: [
      { question: 'Puis-je travailler seul et avoir quand même un agenda ?', answer: 'Oui. Tu peux utiliser Bitiko en indépendant : tes prestations, tes horaires et ton agenda suffisent. L’équipe est facultative.' },
      { question: 'Comment mes clients choisissent-ils un créneau ?', answer: 'Ils sélectionnent une prestation, un jour, puis un horaire disponible, et laissent leur nom et leur numéro. Tu reçois la demande et tu la confirmes.' },
      { question: 'Puis-je proposer des devis ?', answer: 'Tu peux présenter tes prestations avec leur tarif de base et échanger ensuite avec le client par téléphone ou WhatsApp pour préciser l’intervention.' },
      { question: 'Bitiko suit-il mes revenus ?', answer: 'Oui : les rendez-vous marqués comme terminés sont comptés dans ton bilan, avec tes dépenses saisies. Tu obtiens un résultat simple, exportable en PDF ou Excel.' },
    ],
    related: ['salon-coiffure-beaute', 'finances-commercants', 'boutique-en-ligne'],
  },
  {
    slug: 'finances-commercants',
    navLabel: 'Finances et bilan simple',
    metaTitle: 'Suivi des finances et bilan simple pour petit commerce | Bitiko',
    metaDescription:
      'Suis tes recettes, tes dépenses et ton bénéfice sans jargon. Ventes et rendez-vous comptés automatiquement, bilan PDF et Excel gratuit. Pour les petits commerces.',
    eyebrow: 'Finances et gestion',
    h1: 'Sache enfin ce que tu gagnes vraiment, sans faire de comptabilité',
    lead:
      'Bitiko compte tes recettes tout seul (commandes payées, rendez-vous terminés), tu ajoutes tes dépenses en quelques champs, et tu vois ton bénéfice, ta marge et où part ton argent. Un bilan à télécharger en PDF ou en Excel, sur tous les plans.',
    audience: 'Petits commerces et indépendants sans logiciel de comptabilité',
    problems: [
      'En fin de mois, tu ne sais pas si tu as vraiment gagné de l’argent.',
      'Tes comptes sont dans un cahier, dans ta tête et dans tes messages.',
      'Ta banque ou ton comptable te demande un bilan que tu n’as pas.',
    ],
    benefits: [
      { title: 'Tes recettes comptées automatiquement', text: 'Les commandes payées ou livrées et les rendez-vous terminés alimentent ton bilan sans ressaisie. Tu n’ajoutes que ce que Bitiko ne voit pas : ventes au comptoir et dépenses.' },
      { title: 'Tes dépenses en 6 champs', text: 'Date, catégorie, libellé, montant, moyen de paiement, note. Loyer, stock, salaires, transport : des catégories simples, pas un plan comptable.' },
      { title: 'Un résultat lisible', text: 'Recettes, dépenses, bénéfice ou perte, marge, évolution mois par mois et ce qui rapporte le plus : produits et prestations classés.' },
      { title: 'Un bilan à donner à ton comptable', text: 'Une page A4 sobre à enregistrer en PDF, et un export Excel (CSV). Générés sur ton appareil, gratuits sur tous les plans.' },
    ],
    steps: [
      { title: 'Vends ou réserve', text: 'Tes commandes payées et rendez-vous terminés sont comptés automatiquement.' },
      { title: 'Note tes dépenses', text: 'En quelques secondes, au moment où elles ont lieu.' },
      { title: 'Consulte ton bilan', text: 'Chaque mois, ou sur le trimestre et l’année selon ton plan.' },
    ],
    features: [
      'Recettes automatiques (ventes en ligne, prestations terminées) plus recettes saisies',
      'Journal de dépenses par catégorie avec moyen de paiement',
      'Bénéfice, marge et graphique mois par mois',
      'Classement des produits et prestations qui rapportent le plus',
      'Bilan PDF imprimable et export Excel (CSV) inclus dans tous les plans',
      'Comparaison avec la période précédente en plan Pro',
      'Finances réservées au propriétaire et aux managers',
    ],
    shots: [
      { name: 'shop-finances', alt: 'Écran Finances : recettes, dépenses et bénéfice du mois', kind: 'browser' },
      { name: 'bilan-pdf', alt: 'Bilan de gestion imprimable', kind: 'browser' },
      { name: 'dashboard', alt: 'Tableau de bord de l’activité', kind: 'browser' },
    ],
    faq: [
      { question: 'Est-ce une comptabilité officielle ?', answer: 'Non. C’est un bilan de gestion pour piloter ton activité. Il ne remplace ni une comptabilité légale ni une déclaration fiscale ; ton comptable peut s’en servir comme base.' },
      { question: 'Le bilan PDF et l’export Excel sont-ils payants ?', answer: 'Non, ils sont inclus dans tous les plans, y compris gratuit. Ils sont générés sur ton appareil, sans coût pour toi.' },
      { question: 'Qui voit mes finances ?', answer: 'Le propriétaire de l’activité et ses managers. Les vendeurs de ton équipe n’y ont pas accès.' },
      { question: 'Quelle différence entre les plans ?', answer: `Le plan gratuit affiche le mois en cours avec ${free.maxMonthlyFinanceEntries} saisies par mois. Essentiel donne 12 mois d’historique et des saisies illimitées ; Pro ajoute la comparaison entre périodes et un historique complet.` },
    ],
    related: ['boutique-en-ligne', 'salon-coiffure-beaute', 'restaurant'],
  },
]

export const SOLUTION_BY_SLUG: Record<string, SolutionPageData> = Object.fromEntries(SOLUTION_PAGES.map((p) => [p.slug, p]))
