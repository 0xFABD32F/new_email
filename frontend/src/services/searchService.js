// Service de recherche globale
class SearchService {
  constructor() {
    this.searchRoutes = [
      // Section PRINCIPAL
      {
        keywords: ["dashboard", "tableau", "bord", "accueil", "home"],
        title: "Tableau de bord",
        description: "Vue d'ensemble et statistiques",
        path: "/dashboard",
        icon: "fas fa-tachometer-alt",
      },
      {
        keywords: ["utilisateurs", "users", "user", "utilisateur", "compte", "comptes"],
        title: "Utilisateurs",
        description: "Gestion des utilisateurs",
        path: "/dashboard/users",
        icon: "fas fa-users",
      },
      {
        keywords: ["canal", "leads", "lead", "prospect", "prospects"],
        title: "Canal",
        description: "Gestion des prospects",
        path: "/dashboard/leads",
        icon: "fas fa-funnel-dollar",
      },

      // Section GESTION
      {
        keywords: [
          "hardware",
          "matériel",
          "materiel",
          "informatique",
          "télécommunications",
          "telecom",
          "serveur",
          "ordinateur",
        ],
        title: "Matériel IT & Télécommunications",
        description: "Gestion du matériel informatique",
        path: "/dashboard/hardware",
        icon: "fas fa-server",
      },
      {
        keywords: ["clients", "client", "clientèle", "clientele", "entreprise", "société", "societe"],
        title: "Clientèle",
        description: "Gestion de la clientèle",
        path: "/dashboard/clients",
        icon: "fas fa-building",
      },
      {
        keywords: ["fournisseurs", "fournisseur", "supplier", "suppliers", "vendeur"],
        title: "Fournisseurs",
        description: "Gestion des fournisseurs",
        path: "/dashboard/suppliers",
        icon: "fas fa-truck",
      },
      {
        keywords: ["fournitures", "fourniture", "produits", "produit", "stock", "inventory"],
        title: "Fournitures",
        description: "Gestion des fournitures",
        path: "/dashboard/products",
        icon: "fas fa-boxes",
      },
      {
        keywords: ["transport", "frais", "livraison", "shipping", "expedition"],
        title: "Frais de transport",
        description: "Gestion des frais de transport",
        path: "/dashboard/shipping",
        icon: "fas fa-truck-loading",
      },

      // Section COMMERCIAL
      {
        keywords: [
          "opportunités",
          "opportunites",
          "opportunité",
          "opportunite",
          "opportunities",
          "opportunity",
          "affaire",
          "affaires",
        ],
        title: "Opportunités",
        description: "Gestion des opportunités commerciales",
        path: "/dashboard/opportunities",
        icon: "fas fa-lightbulb",
      },
      {
        keywords: ["projets", "projet", "projects", "project"],
        title: "Projets",
        description: "Gestion des projets",
        path: "/dashboard/projects",
        icon: "fas fa-project-diagram",
      },
      {
        keywords: ["devis", "quote", "quotes", "estimation", "estimations"],
        title: "Devis",
        description: "Gestion des devis",
        path: "/dashboard/devis",
        icon: "fas fa-file-invoice-dollar",
      },
      {
        keywords: ["commande", "commandes", "bon", "bons", "po", "purchase", "order", "orders"],
        title: "Bons de commande",
        description: "Gestion des bons de commande",
        path: "/dashboard/purchase-orders",
        icon: "fas fa-file-invoice",
      },
      {
        keywords: ["communication", "message", "messages", "email", "emails", "mail"],
        title: "Communication",
        description: "Centre de communication",
        path: "/dashboard/communication",
        icon: "fas fa-envelope",
      },
    ]
  }

  async search(query) {
    if (!query || query.length < 2) {
      return []
    }

    const normalizedQuery = this.normalizeString(query)
    const results = []

    this.searchRoutes.forEach((route) => {
      const score = this.calculateScore(normalizedQuery, route)
      if (score > 0) {
        results.push({
          ...route,
          score,
        })
      }
    })

    // Trier par score décroissant et retourner les 5 meilleurs résultats
    return results.sort((a, b) => b.score - a.score).slice(0, 5)
  }

  normalizeString(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
      .trim()
  }

  calculateScore(query, route) {
    let score = 0
    const normalizedKeywords = route.keywords.map((k) => this.normalizeString(k))
    const normalizedTitle = this.normalizeString(route.title)

    // Score exact match sur le titre
    if (normalizedTitle.includes(query)) {
      score += 100
    }

    // Score exact match sur les mots-clés
    normalizedKeywords.forEach((keyword) => {
      if (keyword === query) {
        score += 80
      } else if (keyword.includes(query)) {
        score += 60
      } else if (query.includes(keyword)) {
        score += 40
      }
    })

    // Score partiel sur les mots
    const queryWords = query.split(" ")
    queryWords.forEach((word) => {
      if (word.length >= 2) {
        normalizedKeywords.forEach((keyword) => {
          if (keyword.includes(word)) {
            score += 20
          }
        })
        if (normalizedTitle.includes(word)) {
          score += 30
        }
      }
    })

    return score
  }
}

export const searchService = new SearchService()
