import type { GuidedTour } from './types'

export const GUIDED_TOURS: GuidedTour[] = [
  {
    id: 'welcome',
    pages: ['/admin'],
    title: 'Découvrir mon espace',
    description: '1 minute pour savoir où tout se trouve.',
    steps: [
      {
        title: 'Bienvenue dans votre espace',
        body: 'Votre site est déjà en ligne, avec un design et des textes prêts à l’emploi que vous pourrez retoucher. Cette visite rapide vous montre où tout se passe.',
      },
      {
        target: '[data-guide="guide-nav-commandes"]',
        prepare: 'admin-menu-open',
        capability: 'HAS_ORDERS',
        title: 'Commandes',
        body: 'Chaque commande passée sur votre site arrive ici, avec les coordonnées du client. C’est votre point de départ chaque jour.',
      },
      {
        target: '[data-guide="guide-nav-clients"]',
        prepare: 'admin-menu-open',
        capability: 'HAS_CUSTOMERS',
        title: 'Clients',
        body: 'Votre fichier clients se remplit tout seul à chaque commande : ce qu’ils ont acheté, combien, et quand.',
      },
      {
        target: '[data-guide="guide-nav-rendez-vous"]',
        prepare: 'admin-menu-open',
        capability: 'HAS_APPOINTMENTS',
        title: 'Rendez-vous',
        body: 'Votre agenda : chaque réservation faite par un client arrive ici. Vous la confirmez, la déplacez ou l’annulez en un clic.',
      },
      {
        target: '[data-guide="guide-nav-prestations"]',
        prepare: 'admin-menu-open',
        capability: 'HAS_SERVICES',
        title: 'Prestations',
        body: 'Ce que vous proposez à vos clients : un nom, un prix, une durée.',
      },
      {
        target: '[data-guide="guide-nav-produits"]',
        prepare: 'admin-menu-open',
        capability: 'HAS_PRODUCTS',
        title: 'Produits',
        body: 'Ajoutez, modifiez et organisez vos produits : photos, prix, stock et déclinaisons.',
      },
      {
        target: '[data-guide="guide-nav-finances"]',
        prepare: 'admin-menu-open',
        area: 'finance',
        title: 'Gestion',
        body: 'Finances pour voir ce que vous gagnez et ce que vous dépensez, Tontines pour suivre l’épargne de vos clients, Notes pour ne rien oublier.',
      },
      {
        target: '[data-guide="guide-nav-personnaliser"]',
        prepare: 'admin-menu-open',
        capability: 'HAS_SHOP',
        area: 'customize',
        title: 'Personnaliser',
        body: 'Retouchez votre site visuellement : blocs, couleurs, polices. L’aperçu se met à jour en direct, sans toucher au code.',
      },
      {
        target: '[data-guide="guide-nav-parametres"]',
        prepare: 'admin-menu-open',
        area: 'settings',
        title: 'Paramètres',
        body: 'Tout le reste se règle ici : logo et coordonnées, livraison, équipe, abonnement.',
      },
      {
        prepare: 'admin-menu-closed',
        title: 'Et maintenant ?',
        body: 'Suivez la liste « Pour bien démarrer » de votre tableau de bord. Le bouton « ? » en bas à droite reste là : visites de chaque page, réponses aux questions fréquentes et contact de l’équipe.',
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
        title: 'Vos commandes',
        body: 'Chaque commande passée sur votre site arrive ici, avec les coordonnées du client. Voyons comment les traiter sans en rater une.',
      },
      {
        target: '[data-guide="guide-statuts-commandes"]',
        title: 'Filtrer par statut',
        body: 'Commencez par « En attente » : ce sont les commandes à confirmer. Chaque commande passe ensuite de confirmée à livrée, et vous pouvez prévenir le client sur WhatsApp à chaque étape.',
      },
      {
        target: '[data-guide="guide-nouvelle-commande"]',
        title: 'Saisir une commande',
        body: 'Un client vous a commandé par téléphone ou en boutique ? Saisissez-la vous-même pour garder toutes vos ventes au même endroit.',
      },
      {
        target: '[data-guide="guide-export-commandes"]',
        title: 'Exporter',
        body: 'Téléchargez vos commandes dans un fichier Excel pour votre suivi. Ouvrez une commande pour imprimer son bon ou y laisser une note interne.',
      },
    ],
  },
  {
    id: 'products',
    capability: 'HAS_PRODUCTS',
    area: 'catalog_write',
    pages: ['/admin/produits'],
    title: 'Ajouter mes produits',
    description: 'Le tour du formulaire produit, de la recherche et de l’import.',
    steps: [
      {
        title: 'Ajouter un produit',
        body: 'On passe à la pratique : voici comment créer votre premier produit en quelques clics.',
      },
      {
        target: '[data-guide="guide-nouveau-produit"]',
        title: 'Nouveau produit',
        body: 'Ce bouton ouvre un formulaire guidé : nom, prix, stock, photos. Ajoutez si besoin des déclinaisons (taille, couleur…).',
      },
      {
        target: '[data-guide="guide-recherche-produit"]',
        title: 'Recherche et filtres',
        body: 'Votre catalogue grandit vite : recherchez par nom, filtrez par catégorie ou par niveau de stock.',
      },
      {
        title: 'Astuce',
        body: 'Le bouton « Importer (CSV) » ajoute plusieurs produits d’un coup si vous les avez déjà dans un tableur.',
      },
    ],
  },
  {
    id: 'appointments',
    capability: 'HAS_APPOINTMENTS',
    pages: ['/admin/rendez-vous'],
    title: 'Gérer mon agenda',
    description: 'Confirmer les demandes, ajouter un rendez-vous, régler vos horaires.',
    steps: [
      {
        title: 'Votre agenda',
        body: 'Vos clients réservent sur votre site : leurs demandes arrivent ici. Une demande confirmée bloque le créneau.',
      },
      {
        target: '[data-guide="guide-rdv-agenda"]',
        title: 'Jour par jour',
        body: 'Changez de jour avec les flèches ou la semaine. Les demandes « à confirmer » sont signalées : confirmez ou refusez, puis prévenez le client sur WhatsApp.',
      },
      {
        target: '[data-guide="guide-rdv-ajouter"]',
        title: 'Ajouter un rendez-vous',
        body: 'Un client a appelé ou est passé ? Ajoutez le rendez-vous vous-même pour garder tout votre agenda au même endroit.',
      },
      {
        target: '[data-guide="guide-rdv-horaires"]',
        title: 'Vos horaires',
        body: 'Réglez vos jours et heures d’ouverture, et vos jours de fermeture : seuls ces créneaux sont proposés à vos clients.',
      },
    ],
  },
  {
    id: 'services',
    capability: 'HAS_SERVICES',
    area: 'catalog_write',
    pages: ['/admin/prestations'],
    title: 'Configurer mes prestations',
    description: 'Créer votre catalogue de prestations pour que vos clients réservent en ligne.',
    steps: [
      {
        title: 'Vos prestations',
        body: 'Vos clients choisissent une prestation puis un créneau : c’est ce catalogue qui alimente votre page de réservation.',
      },
      {
        target: '[data-guide="guide-nouvelle-prestation"]',
        title: 'Nouvelle prestation',
        body: 'Donnez un nom, un prix et une durée. La durée sert à calculer les créneaux libres : une coupe de 30 min n’occupe pas l’agenda comme un soin de 2 h.',
      },
      {
        title: 'Astuce',
        body: 'Réglez vos horaires dans « Rendez-vous », puis partagez le lien de votre page de réservation sur WhatsApp et vos réseaux.',
      },
    ],
  },
  {
    id: 'finance',
    area: 'finance',
    pages: ['/admin/gestion'],
    title: 'Suivre mes finances',
    description: 'Lire votre bilan, noter vos dépenses et sortir un bilan PDF.',
    steps: [
      {
        title: 'Vos finances, sans comptabilité',
        body: 'Vos commandes payées ou livrées et vos rendez-vous terminés sont comptés automatiquement. Vous n’ajoutez que ce que Bitiko ne voit pas.',
      },
      {
        target: '[data-guide="guide-finance-onglets"]',
        title: 'Bilan et journal',
        body: 'Le bilan montre ce que vous gagnez, dépensez et ce qu’il vous reste. Le journal sert à noter vos dépenses (stock, loyer, transport…) et vos ventes hors ligne.',
      },
      {
        target: '[data-guide="guide-bilan-periode"]',
        title: 'Choisir la période',
        body: 'Ce mois, le mois dernier, le trimestre ou l’année : le bilan se recalcule aussitôt.',
      },
      {
        target: '[data-guide="guide-bilan-export"]',
        title: 'Télécharger',
        body: 'Un tableur pour Excel ou un bilan PDF imprimable, pour votre comptable, votre banque ou vos archives.',
      },
    ],
  },
  {
    id: 'tontines',
    area: 'finance',
    pages: ['/admin/tontines'],
    title: 'Tenir une tontine',
    description: 'Suivre l’épargne de vos clients : versements, retards et remise.',
    steps: [
      {
        title: 'La tontine de votre boutique',
        body: 'Vos clients épargnent chez vous pour une occasion (Tabaski, rentrée, fêtes). Bitiko tient le carnet : l’argent reste entre vos mains.',
      },
      {
        target: '[data-guide="guide-nouvelle-tontine"]',
        title: 'Créer une tontine',
        body: 'Choisissez un versement conseillé, un rythme (jour, semaine, mois) et la date de remise. Bitiko calcule ce que chacun aura épargné.',
      },
      {
        title: 'Encaisser',
        body: 'Dans une tontine, inscrivez vos clients puis touchez « Encaisser » à chaque versement. Un reçu WhatsApp est prêt à envoyer, et les retards sont signalés automatiquement.',
      },
      {
        title: 'La remise',
        body: 'Le jour venu, ouvrez la fiche du membre et faites la remise : en marchandise (comptée dans vos recettes si vous le souhaitez) ou en argent s’il se désiste.',
      },
    ],
  },
  {
    id: 'notes',
    area: 'notes',
    pages: ['/admin/notes'],
    title: 'Prendre des notes',
    description: 'Noter vite, épingler l’important et retrouver toutes vos notes.',
    steps: [
      {
        target: '[data-guide="guide-notes-saisie"]',
        title: 'Écrire une note',
        body: 'Tapez directement : le titre et la couleur apparaissent dès que vous commencez. Ctrl + Entrée enregistre.',
      },
      {
        target: '[data-guide="guide-notes-onglets"]',
        title: 'Toutes vos notes',
        body: '« Toutes les notes » rassemble aussi celles laissées sur vos commandes, vos dépenses et vos tontines, avec un lien vers chaque fiche.',
      },
      {
        title: 'Astuce',
        body: 'Épinglez une note pour la garder en haut, et utilisez la recherche : elle ignore les accents.',
      },
    ],
  },
  {
    id: 'customize',
    capability: 'HAS_SHOP',
    area: 'customize',
    pages: ['/admin/personnaliser'],
    title: 'Personnaliser mon site',
    description: 'Couleurs, blocs, textes et publication : le tour de la personnalisation.',
    steps: [
      {
        prepare: 'builder-tab:preview',
        title: 'Personnaliser votre site',
        body: 'Deux outils pour donner votre style à votre site, en direct et sans toucher au code.',
      },
      {
        target: '[data-guide="guide-mode-switch"]',
        title: 'Apparence ou Mise en page',
        body: 'Apparence : couleurs, polices, arrondis et designs complets, pour tout le site d’un coup. Mise en page : ajoutez, réorganisez ou masquez les blocs de chaque page.',
      },
      {
        target: '[data-guide="guide-appearance-settings"]',
        prepare: 'builder-tab:settings',
        title: 'Couleurs et boutons',
        body: 'Dépliez « Couleurs » pour la couleur de votre marque, le fond et les textes, puis « Boutons » pour leurs styles. L’aperçu s’actualise en direct.',
      },
      {
        target: '[data-guide="guide-page-switcher"]',
        prepare: 'builder-tab:preview',
        title: 'Vérifier chaque page',
        body: 'Accueil, Catalogue, Fiche produit, Panier, Commande : votre thème s’applique partout. Cliquez une page pour la vérifier avant de publier.',
      },
      {
        target: '[data-guide="guide-publier"]',
        title: 'Publier',
        body: 'Vos modifications sont enregistrées au fil de l’eau ; cliquez sur Publier pour mettre votre site à jour. Chaque publication est archivée : vous pouvez revenir en arrière.',
      },
      {
        title: 'C’est tout',
        body: 'Le bouton « ? » en bas à droite relance ces visites à tout moment.',
      },
    ],
  },
]

export const GUIDED_TOUR_BY_ID: Record<string, GuidedTour> = Object.fromEntries(
  GUIDED_TOURS.map((tour) => [tour.id, tour]),
)
