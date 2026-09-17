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
        title: 'Commandes',
        body: 'Chaque commande passée sur ta boutique arrive ici, avec le suivi du client. C’est ton tableau de bord commercial.',
      },
      {
        target: '[data-guide="guide-nav-produits"]',
        title: 'Produits',
        body: 'Ajoute, modifie et organise tes produits. Le plan gratuit autorise jusqu’à 15 produits actifs et 4 photos par produit.',
      },
      {
        target: '[data-guide="guide-nav-personnaliser"]',
        title: 'Personnaliser',
        body: 'Retouche ta boutique visuellement : blocs, couleurs, polices. L’aperçu se met à jour en direct, sans toucher au code.',
      },
      {
        target: '[data-guide="guide-nav-parametres"]',
        title: 'Paramètres',
        body: 'Tout le reste se règle ici : coordonnées de contact, livraison et stock, facturation, compte.',
      },
      {
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
    description: 'Blocs, thème et publication : le tour du builder.',
    steps: [
      {
        title: 'Personnaliser ta boutique',
        body: 'Chaque page de ta boutique se modifie ici, en direct, sans toucher au code.',
      },
      {
        target: '[data-guide="guide-page-switcher"]',
        title: 'Choisir une page',
        body: 'Accueil, Catalogue, Fiche produit, Panier, Commande… et tes pages personnalisées si tu en crées.',
      },
      {
        target: '[data-guide="guide-builder-sidebar"]',
        title: 'Blocs et thème',
        body: 'Blocs : ajoute, réorganise, duplique ou masque une section. Thème : couleurs, polices, arrondis. Styles : d’autres designs prêts à l’emploi.',
      },
      {
        target: '[data-guide="guide-publier"]',
        title: 'Publier',
        body: 'Tes modifications sont enregistrées au fil de l’eau ; clique sur Publier pour mettre ta boutique en ligne à jour.',
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