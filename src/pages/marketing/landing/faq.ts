import { PLANS } from '@/config/plans'

/** Questions fréquentes de la page d'accueil : affichées dans la page ET publiées en données structurées (FAQPage). */
export const faq = [
  {
    question: 'Est-ce que Bitiko est vraiment gratuit ?',
    answer:
      `Oui. Le plan Découverte est 100% gratuit, sans engagement et sans carte bancaire. Tu as un espace en ligne fonctionnel avec ${PLANS.free.maxActiveProducts} produits, ${PLANS.free.maxActiveServices} prestations, la prise de rendez-vous, la réservation de tables, la livraison et un bilan simple de tes finances. Essentiel à 3 000 F ajoute le builder complet, plus de produits et de prestations et 12 mois d'historique financier ; Pro à 10 000 F retire les limites et ajoute la comparaison entre périodes.`,
  },
  {
    question: 'Je vends des produits : que fait Bitiko pour moi ?',
    answer:
      'Tu obtiens une boutique en ligne à ton lien : catalogue avec photos, prix, variantes et stock, panier, livraison par secteurs et paiement en espèces ou mobile money. Chaque commande t’arrive formatée sur WhatsApp et dans ton tableau de bord, avec son statut (en attente, payée, livrée). Le stock baisse à chaque vente, tu es alerté avant la rupture, et tes clients sont enregistrés pour être relancés. Tu peux importer ton catalogue depuis un fichier CSV.',
  },
  {
    question: 'Puis-je vendre des produits et proposer des services à la fois ?',
    answer:
      'Oui. Un même espace peut avoir un catalogue de produits et des prestations réservables (par exemple un salon qui vend ses soins et ses produits). Les recettes des deux sont réunies dans le même bilan.',
  },
  {
    question: 'Comment mes clients réservent-ils, et comment suis-je prévenu ?',
    answer:
      'Le client choisit une prestation (ou une table), un jour et un créneau libre sur ton site, puis laisse son nom et son numéro. La demande t\'arrive sur ton WhatsApp, formatée, et apparaît dans ton agenda : tu confirmes ou tu refuses d\'un clic, puis tu préviens ton client par téléphone ou WhatsApp depuis la même fiche. Comme pour les commandes de la boutique.',
  },
  {
    question: 'Les horaires peuvent-ils être différents selon les jours ?',
    answer:
      'Oui. Tu règles chaque jour séparément (par exemple samedi de 9 h à 17 h, dimanche fermé), tu peux ajouter une pause en milieu de journée et marquer des jours de congé. Le client ne voit que les créneaux réellement disponibles.',
  },
  {
    question: 'Est-ce que Bitiko fait ma comptabilité ?',
    answer:
      'Non. Bitiko te donne un bilan de gestion simple : tes recettes (commandes payées, rendez-vous terminés, ventes saisies), tes dépenses, ton bénéfice et l\'évolution mois par mois. Tu peux le télécharger en PDF ou en Excel pour ton comptable ou ta banque. Ce n\'est pas une comptabilité légale ni une déclaration fiscale.',
  },
  {
    question: 'Comment les clients paient-ils ?',
    answer:
      'Les deux options principales : espèces (à la livraison ou sur place) ou mobile money — Wave, Orange Money. Le client paie selon ce que tu actives. Tu confirmes le paiement avec lui sur WhatsApp, pas besoin de passer par un prestataire tiers.',
  },
  {
    question: 'Est-ce que je dois être développeur ?',
    answer:
      'Non. Crée ton compte, choisis un nom, ajoute tes produits ou tes prestations — c\'est tout. Pas de ligne de code. Si tu sais envoyer une photo sur WhatsApp, tu sais utiliser Bitiko.',
  },
  {
    question: 'Comment ça marche pour la livraison ?',
    answer:
      'Tu définis tes secteurs (par exemple Dakar, Rufisque, Thiès) et le tarif par secteur. À l\'intérieur de chaque secteur, tu listes les villes. Au checkout, le client choisit sa ville et le tarif s\'applique automatiquement. Tu peux aussi activer la livraison gratuite au-delà d\'un certain montant.',
  },
  {
    question: 'Puis-je utiliser Bitiko hors du Sénégal ?',
    answer:
      'Oui. Tu choisis ton pays à la création de ton espace : les numéros de téléphone, le fuseau horaire des créneaux et la devise s\'adaptent. Les prix de Bitiko sont affichés en francs CFA.',
  },
  {
    question: 'Qui peut voir mon espace ?',
    answer:
      'Avec tous les plans, ton espace est public sur son sous-domaine bitiko.shop. La personnalisation de base est disponible gratuitement ; les images de catégories sont disponibles avec Essentiel et Pro, et la marque Bitiko se retire avec Pro.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer:
      'Chaque activité est complètement isolée. Toi seul(e) et les personnes de ton équipe que tu invites peuvent voir tes commandes, tes rendez-vous et tes paramètres ; tes finances restent réservées au propriétaire et aux managers. Notre équipe support ne peut accéder à tes données que pour t\'aider, et chaque accès est tracé.',
  },
  {
    question: 'Est-ce que je paye une commission sur mes ventes ?',
    answer:
      'Non. Zéro commission. Quoi que tu vendes, tu gardes 100% du prix. Le plan gratuit est vraiment gratuit, puis Essentiel coûte 3 000 F/mois et Pro 10 000 F/mois — rien de plus sur tes revenus. L\'abonnement se renouvelle à la main : sans paiement, ton espace repasse simplement au plan gratuit.',
  },
]
