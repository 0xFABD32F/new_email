import API from "./api"

// Service pour la gestion des utilisateurs et profils
export const userService = {
  // Récupérer les informations de l'utilisateur connecté
  getCurrentUser: () => {
    const userId = localStorage.getItem("userId")
    const authToken = localStorage.getItem("authToken")

    if (!userId) {
      console.error("Aucun userId trouvé dans localStorage")
      throw new Error("Utilisateur non connecté - userId manquant")
    }

    if (!authToken) {
      console.error("Aucun token d'authentification trouvé")
      throw new Error("Utilisateur non connecté - token manquant")
    }

    console.log("Récupération des informations pour l'utilisateur ID:", userId)
    return API.get(`/auth/users/${userId}`)
  },

  // Mettre à jour le profil de l'utilisateur connecté
  updateCurrentUser: (userData) => {
    const userId = localStorage.getItem("userId")
    if (!userId) {
      throw new Error("Utilisateur non connecté")
    }
    return API.put(`/auth/${userId}`, userData)
  },

  // Récupérer tous les utilisateurs (pour les admins)
  getAllUsers: () => {
    return API.get("/auth/users")
  },

  // Créer un nouvel utilisateur
  createUser: (userData) => {
    return API.post("/auth/", userData)
  },

  // Supprimer un utilisateur
  deleteUser: (userId) => {
    return API.delete(`/auth/${userId}`)
  },

  // Vérifier si l'utilisateur est connecté
  isLoggedIn: () => {
    const userId = localStorage.getItem("userId")
    const authToken = localStorage.getItem("authToken")
    return !!(userId && authToken)
  },

  // Obtenir les informations de base depuis localStorage
  getStoredUserInfo: () => {
    return {
      userId: localStorage.getItem("userId"),
      email: localStorage.getItem("userEmail"),
      role: localStorage.getItem("userRole"),
      droitAcces: localStorage.getItem("userDroitAcces"),
    }
  },
}

export default userService
