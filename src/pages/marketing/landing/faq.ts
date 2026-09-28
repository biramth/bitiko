import { PLANS } from '@/config/plans'

/** Questions fréquentes de la page d'accueil : affichées dans la page ET publiées en données structurées (FAQPage). */
export const faq = [
  {
    question: 'Est-ce que Bitiko est vraiment gratuit ?',
    answer:
      `Oui. Le plan Découverte est gratuit, sans limite de durée, sans engagement et sans carte bancaire. Tu as un espace en ligne complet avec ${PLANS.free.maxActiveProducts} produits, ${PLANS.free.maxActiveServices} prestations, la prise de rendez-vous, la réservation de tables, la livraison et un bilan simple de tes finances. Essentiel (3 000 F/mois) et Pro (10 000 F/mois) augmentent les limites et ajoutent des outils avancés, seulement quand tu en as besoin.`,
  },
  {
    question: 'Combien de temps faut-il pour être en ligne ?',
    answer:
      'Deux minutes pour créer ton espace : le nom de ton activité, ton métier et ton numéro WhatsApp. Bitiko te prépare une vitrine adaptée à ton métier, tu ajoutes tes premiers produits ou prestations, et tu peux partager ton lien le jour même.',
  },
  {
    question: 'Mes clients doivent-ils installer une application ou créer un compte ?',
    answer:
      'Non. Ils ouvrent ton lien depuis leur téléphone, choisissent, puis laissent leur nom et leur numéro. Rien à télécharger, aucun mot de passe : c\'est pour ça qu\'ils vont jusqu\'au bout de la commande ou de la réservation.',
  },
  {
    question: 'Je vends des produits : que fait Bitiko pour moi ?',
    answer:
      'Tu obtiens une boutique en ligne à ton lien : catalogue avec photos, prix, variantes et stock, panier, livraison par zones et paiement en espèces ou mobile money. Chaque commande t\'arrive formatée sur WhatsApp et dans ton tableau de bord, avec son statut (en attente, payée, livrée). Le stock baisse à chaque vente, tu es alerté avant la rupture, et tes clients sont enregistrés pour être relancés. Tu peux importer ton catalogue depuis un fichier CSV.',
  },
  {
    question: 'Comment mes clients réservent-ils, et comment suis-je prévenu ?',
    answer:
      'Le client choisit une prestation (ou une table), un jour et un créneau libre sur ton site, puis laisse son nom et son numéro. La demande t\'arrive sur ton WhatsApp, formatée, et apparaît dans ton agenda : tu confirmes ou tu refuses d\'un clic, puis tu préviens ton client depuis la même fiche.',
  },
  {
    question: 'Puis-je vendre des produits et proposer des services à la fois ?',
    answer:
      'Oui. Un même espace peut avoir un catalogue de produits et des prestations réservables (par exemple un salon qui vend ses soins et ses produits). Les recettes des deux sont réunies dans le même bilan.',
  },
  {
    question: 'Les horaires peuvent-ils être différents selon les jours ?',
    answer:
      'Oui. Tu règles chaque jour séparément (par exemple samedi de 9 h à 17 h, dimanche fermé), tu peux ajouter une pause en milieu de journée et marquer des jours de congé. Le client ne voit que les créneaux réellement disponibles.',
  },
  {
    question: 'Comment les clients paient-ils ?',
    answer:
      'Espèces (à la livraison ou sur place) ou mobile money, selon ce que tu actives. Tu confirmes le paiement avec ton client sur WhatsApp : pas d\'intermédiaire de paiement à configurer, et pas de commission prélevée au passage.',
  },
  {
    question: 'Comment ça marche pour la livraison ?',
    answer:
      'Tu définis tes zones (par exemple centre-ville, banlieue, autres villes) et le tarif de chacune. Au moment de commander, le client choisit sa zone et le tarif s\'applique automatiquement. Tu peux aussi offrir la livraison au-delà d\'un certain montant.',
  },
  {
    question: 'Est-ce que Bitiko fait ma comptabilité ?',
    answer:
      'Non. Bitiko te donne un bilan de gestion simple : tes recettes (commandes payées, rendez-vous terminés, ventes saisies), tes dépenses, ton bénéfice et l\'évolution mois par mois. Tu peux le télécharger en PDF ou en Excel pour ton comptable ou ta banque. Ce n\'est pas une comptabilité légale ni une déclaration fiscale.',
  },
  {
    question: 'Est-ce que je dois être développeur ?',
    answer:
      'Non. Crée ton compte, choisis un nom, ajoute tes produits ou tes prestations : c\'est tout. Pas une ligne de code. Si tu sais envoyer une photo sur WhatsApp, tu sais utiliser Bitiko.',
  },
  {
    question: 'Est-ce que je paye une commission sur mes ventes ?',
    answer:
      'Non. Zéro commission. Quoi que tu vendes, tu gardes 100 % du prix. L\'abonnement se renouvelle à la main, sans prélèvement automatique : sans paiement, ton espace repasse simplement au plan gratuit, sans rien perdre.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer:
      'Chaque activité est complètement isolée. Toi et les personnes de ton équipe que tu invites êtes les seuls à voir tes commandes, tes rendez-vous et tes paramètres ; tes finances restent réservées au propriétaire et aux managers. Notre équipe support ne peut accéder à tes données que pour t\'aider, et chaque accès est tracé. Tes commandes et tes finances s\'exportent en Excel à tout moment.',
  },
]
