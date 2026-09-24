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
        body: 'Ta boutique est déjà en ligne, thème appliqué et contenu généré depuis tes réponses. Cette visite rapide te montre où tout se passe.',
      },
      {
        target: '[data-guide="guide-nav-commandes"]',
        prepare: 'admin-menu-open',
        title: 'Commandes',
        body: 'Chaque commande passée sur ta boutique arrive ici, avec le suivi du client. C’est ton tableau de bord commercial.',
      },
      {
        target: '[data-guide="guide-nav-produits"]',
        prepare: 'admin-menu-open',
        title: 'Produits',
        body: 'Ajoute, modifie et organise tes produits. Le plan gratuit autorise jusqu’à 15 produits actifs et 4 photos par produit.',
      },
      {
        target: '[data-guide="guide-nav-personnaliser"]',
        prepare: 'admin-menu-open',
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
        body: 'Le bouton d’aide (icône « ? ») reste disponible en bas à droite pour relancer ces visites quand tu veux. Bonne vente !',
      },
    ],
  },
  {
    id: 'products',
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
        body: 'Ce bouton ouvre un formulaire guidé : nom, prix, stock, photos… Le plan gratuit offre 4 photos par produit, en comptant une photo par déclinaison (taille, couleur…).',
      },
      {
        target: '[data-guide="guide-recherche-produit"]',
        title: 'Recherche et filtres',
        body: 'Ta vitrine grandit vite : recherche par nom, filtre par catégorie ou par niveau de stock.',
      },
      {
        target: '[data-guide="guide-plan-produits"]',
        title: 'Ta jauge de plan',
        body: 'Surveille cette jauge : le plan gratuit plafonne à 15 produits actifs. Au-delà, tes produits sont enregistrés inactifs — passe à Essentiel pour en activer plus.',
      },
      {
        title: 'Astuce',
        body: 'Le bouton « Importer (CSV) » ajoute plusieurs produits d’un coup si tu as déjà un tableur.',
      },
    ],
  },
  {
    id: 'customize',
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