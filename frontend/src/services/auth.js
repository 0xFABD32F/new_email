import API from "./api"

export const login = (email, password) => {
  return API.post("/auth/login", {
    email: email,
    mot_de_passe: password,
  })
    .then((response) => {
      console.log("Réponse de connexion:", response.data)

      // Stocker les informations de l'utilisateur connecté
      if (response.data.user_id) {
        localStorage.setItem("userId", response.data.user_id.toString())
        localStorage.setItem("userEmail", response.data.email || "")
        localStorage.setItem("userRole", response.data.role || "")
        localStorage.setItem("userDroitAcces", response.data.droit_acces || "")
        localStorage.setItem("userName", response.data.nom || "")

        // Générer un token simple (vous pouvez utiliser un vrai JWT plus tard)
        const token = `user_${response.data.user_id}_${Date.now()}`
        localStorage.setItem("authToken", token)

        console.log("Informations stockées dans localStorage:", {
          userId: localStorage.getItem("userId"),
          email: localStorage.getItem("userEmail"),
          role: localStorage.getItem("userRole"),
          nom: localStorage.getItem("userName"),
        })
      }
      return response
    })
    .catch((error) => {
      console.error("Erreur lors de la connexion:", error)
      throw error
    })
}

export const register = (userData) => {
  return API.post("/auth/register", {
    nom: userData.nom,
    email: userData.email,
    phone: userData.phone,
    role: userData.role,
    droit_acces: userData.droit_acces,
    mot_de_passe: userData.mot_de_passe,
  })
}

export const logout = () => {
  console.log("Déconnexion - suppression des données localStorage")
  localStorage.removeItem("authToken")
  localStorage.removeItem("userId")
  localStorage.removeItem("userEmail")
  localStorage.removeItem("userRole")
  localStorage.removeItem("userDroitAcces")
  localStorage.removeItem("userName")
  sessionStorage.clear()
}

export const getCurrentUserId = () => {
  return localStorage.getItem("userId")
}

export const getCurrentUserRole = () => {
  return localStorage.getItem("userRole")
}

export const getCurrentUserName = () => {
  return localStorage.getItem("userName")
}

// Fonction pour vérifier si l'utilisateur est connecté
export const isAuthenticated = () => {
  const userId = localStorage.getItem("userId")
  const authToken = localStorage.getItem("authToken")
  return !!(userId && authToken)
}
