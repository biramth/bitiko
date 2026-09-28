import type { GuidedTour } from './types'

export const GUIDED_TOURS: GuidedTour[] = [
  {
    id: 'welcome',
    pages: ['/admin'],
    title: 'Découvrir mon espace',
    description: '30 secondes pour comprendre l’admin Bitiko à la création de ta boutique.',
    steps: [
      {
        title: 'Bienvenue dans ton espace vendeur',
        body: 'Ta boutique est déjà en ligne, avec un design et des textes prêts à l’emploi que tu pourras retoucher à ta façon. Cette visite rapide te montre où tout se passe.',
      },
      {
        target: '[data-guide="guide-nav-commandes"]',
        prepare: 'admin-menu-open',
        capability: 'HAS_ORDERS',
        title: 'Commandes',
        body: 'Chaque commande passée sur ta boutique arrive ici, avec le suivi du client. C’est ton tableau de bord commercial.',
      },
      {
        target: '[data-guide="guide-nav-rendez-vous"]',
        prepare: 'admin-menu-open',
        capability: 'HAS_APPOINTMENTS',
        title: 'Rendez-vous',
        body: 'Ton agenda : chaque réservation faite par un client arrive ici. Tu la confirmes, la déplaces ou l’annules en un clic.',
      },
      {
        target: '[data-guide="guide-nav-prestations"]',
        prepare: 'admin-menu-open',
        capability: 'HAS_SERVICES',
        title: 'Prestations',
        body: `Ce que tu proposes à tes clients : un nom, un prix, une durée.`,
      },
      {
        target: '[data-guide="guide-nav-produits"]',
        prepare: 'admin-menu-open',
        capability: 'HAS_PRODUCTS',
        title: 'Produits',
        body: `Ajoute, modifie et organise tes produits.`,
      },
      {
        target: '[data-guide="guide-nav-personnaliser"]',
        prepare: 'admin-menu-open',
        capability: 'HAS_SHOP',
        title: 'Personnaliser',
        body: 'Retouche ta boutique visuellement : blocs, couleurs, polices. L’aperçu se met à jour en direct, sans toucher au code.',
      },
      {
        target: '[data-guide="guide-nav-parametres"]',
        prepare: 'admin-menu-open',
        title: 'Paramètres',
        body: 'Tout le reste se règle ici : coordonnées de contact, livraison et stock, facturation, compte.',
      },
      {
        prepare: 'admin-menu-closed',
        title: 'Et maintenant ?',
        body: 'Le bouton d’aide (icône « ? ») reste en bas à droite : tu y trouveras ta liste « Pour démarrer », les autres visites guidées et de quoi nous contacter. Bonne vente !',
      },
    ],
  },
  {
    id: 'products',
    capability: 'HAS_PRODUCTS',
    area: 'catalog_write',
    pages: ['/admin/produits'],
    title: 'Ajouter mes produits',
    description: 'Le tour du formulaire produit et de la jauge de plan.',
    steps: [
      {
        title: 'Ajouter un produit',
        body: 'On passe à la pratique : voici comment créer ton premier produit en quelques clics.',
      },
      {
        target: '[data-guide="guide-nouveau-produit"]',
        title: 'Nouveau produit',
        body: `Ce bouton ouvre un formulaire guidé : nom, prix, stock, photos… Ajoute des photos et, si besoin, des déclinaisons (taille, couleur…).`,
      },
      {
        target: '[data-guide="guide-recherche-produit"]',
        title: 'Recherche et filtres',
        body: 'Ta vitrine grandit vite : recherche par nom, filtre par catégorie ou par niveau de stock.',
      },
      {
        title: 'Astuce',
        body: 'Le bouton « Importer (CSV) » ajoute plusieurs produits d’un coup si tu as déjà un tableur.',
      },
    ],
  },
  {
    id: 'orders',
    capability: 'HAS_ORDERS',
    pages: ['/admin/commandes'],
    title: 'Traiter mes commandes',
    description: 'Suivre une commande du premier message à la livraison, et l’exporter.',
    steps: [
      {
        title: 'Tes commandes',
        body: 'Chaque commande passée sur ta boutique arrive ici, avec les coordonnées du client. Voyons comment les traiter sans en rater une.',
      },
      {
        target: '[data-guide="guide-statuts-commandes"]',
        title: 'Filtrer par statut',
        body: 'Commence par « En attente » : ce sont les commandes à confirmer. Chaque commande passe ensuite de confirmée à livrée, et le client est prévenu par WhatsApp si tu le souhaites.',
      },
      {
        target: '[data-guide="guide-nouvelle-commande"]',
        title: 'Saisir une commande',
        body: 'Un client t’a commandé par téléphone ou en boutique ? Saisis-la toi-même pour garder toutes tes ventes au même endroit.',
      },
      {
        target: '[data-guide="guide-export-commandes"]',
        title: 'Exporter',
        body: 'Télécharge tes commandes dans un fichier Excel pour ta comptabilité ou ton suivi. Ouvre une commande pour imprimer son bon.',
      },
    ],
  },
  {
    id: 'services',
    capability: 'HAS_SERVICES',
    area: 'catalog_write',
    pages: ['/admin/prestations'],
    title: 'Configurer mes prestations',
    description: 'Créer ton catalogue de prestations pour que tes clients réservent en ligne.',
    steps: [
      {
        title: 'Tes prestations',
        body: 'Tes clients choisissent une prestation puis un créneau : c’est ce catalogue qui alimente ta page de réservation.',
      },
      {
        target: '[data-guide="guide-nouvelle-prestation"]',
        title: 'Nouvelle prestation',
        body: 'Donne un nom, un prix et une durée. La durée sert à calculer les créneaux libres : une coupe de 30 min n’occupe pas ton agenda comme un soin de 2 h.',
      },
      {
        title: 'Astuce',
        body: 'Règle tes horaires d’ouverture dans « Rendez-vous », puis partage le lien de ta page de réservation sur WhatsApp et tes réseaux.',
      },
    ],
  },
  {
    id: 'customize',
    capability: 'HAS_SHOP',
    area: 'customize',
    pages: ['/admin/personnaliser'],
    title: 'Personnaliser ma boutique',
    description: 'Couleurs, blocs, textes et publication : le tour de la personnalisation.',
    steps: [
      {
        prepare: 'builder-tab:preview',
        title: 'Personnaliser ta boutique',
        body: 'Deux outils pour donner ton style à ta boutique, en direct et sans toucher au code.',
      },
      {
        target: '[data-guide="guide-mode-switch"]',
        title: 'Apparence ou Mise en page',
        body: 'Apparence : couleurs, polices, arrondis et designs complets, pour toute la boutique d’un coup. Mise en page : ajoute, réorganise ou masque les blocs de chaque page.',
      },
      {
        target: '[data-guide="guide-appearance-settings"]',
        prepare: 'builder-tab:settings',
        title: 'Couleurs et boutons',
        body: 'Déplie « Couleurs » pour la couleur de ta marque, le fond et les textes, puis « Boutons » pour le principal, le secondaire et le tertiaire — avec leur texte. L’aperçu s’actualise en direct.',
      },
      {
        target: '[data-guide="guide-page-switcher"]',
        prepare: 'builder-tab:preview',
        title: 'Vérifier chaque page',
        body: 'Accueil, Catalogue, Fiche produit, Panier, Commande : ton thème s’applique partout. Clique une page pour la vérifier avant de publier.',
      },
      {
        target: '[data-guide="guide-publier"]',
        title: 'Publier',
        body: 'Tes modifications sont enregistrées au fil de l’eau ; clique sur Publier pour mettre ta boutique en ligne à jour. Chaque publication est archivée : tu peux revenir en arrière si besoin.',
      },
      {
        title: 'C’est tout',
        body: 'Tes réglages apparaissent immédiatement sur ta boutique. Le bouton « ? » en bas à droite relance ces visites à tout moment.',
      },
    ],
  },
]

export const GUIDED_TOUR_BY_ID: Record<string, GuidedTour> = Object.fromEntries(
  GUIDED_TOURS.map((tour) => [tour.id, tour]),
)