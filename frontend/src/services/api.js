import axios from "axios"

const baseURL = "http://localhost:8000";

const API = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
})

API.interceptors.request.use(
  (config) => {
    // Log pour déboguer
    console.log(
      `Requête API avant modification: ${config.method.toUpperCase()} ${config.url}`,
      config.data instanceof FormData ? "FormData" : config.params || config.data,
    )

    // IMPORTANT: Pour les téléchargements de fichiers, supprimer l'en-tête Content-Type
    // pour permettre à axios de définir automatiquement le bon boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"]
      console.log("FormData détecté, Content-Type supprimé pour permettre à axios de définir le bon boundary")
    }

    // Gestion des paramètres vides
    if (
      config.url === "/hardware/brands" ||
      config.url === "/hardware/countries" ||
      config.url === "/shipping-hardware/list" ||
      config.url === "/shipping-hardware/brands" ||
      config.url === "/shipping-hardware/countries"
    ) {
      if (config.params) {
        const newParams = {}
        let hasParams = false

        for (const key in config.params) {
          if (config.params[key] !== "" && config.params[key] !== undefined && config.params[key] !== null) {
            newParams[key] = config.params[key]
            hasParams = true
          }
        }

        config.params = hasParams ? newParams : undefined
      }
    }

    // Redirection des routes hardware/shipping
    if (config.url.match(/\/hardware\/(\d+)\/shipping$/)) {
      const hardwareId = config.url.match(/\/hardware\/(\d+)\/shipping$/)[1]

      if (config.method === "get") {
        console.log(`Redirection GET /hardware/${hardwareId}/shipping vers /shipping-hardware/item/${hardwareId}`)
        config.url = `/shipping-hardware/item/${hardwareId}`
      } else if (config.method === "post") {
        console.log(`Redirection POST /hardware/${hardwareId}/shipping vers /shipping-hardware/create/${hardwareId}`)
        config.url = `/shipping-hardware/create/${hardwareId}`
      }
    }

    if (config.url.match(/\/hardware\/(\d+)\/shipping-multi-leg$/)) {
      const hardwareId = config.url.match(/\/hardware\/(\d+)\/shipping-multi-leg$/)[1]
      console.log(
        `Redirection /hardware/${hardwareId}/shipping-multi-leg vers /shipping-hardware/multi-leg/${hardwareId}`,
      )
      config.url = `/shipping-hardware/multi-leg/${hardwareId}`
    } else if (config.url === "/hardware/shipping") {
      config.url = "/shipping-hardware/list"
    }

    console.log(
      `Requête API après modification: ${config.method.toUpperCase()} ${config.url}`,
      config.data instanceof FormData ? "FormData" : config.params || config.data,
    )
    return config
  },
  (error) => {
    console.error("Erreur de requête API:", error)
    return Promise.reject(error)
  },
)

API.interceptors.response.use(
  (response) => {
    console.log(`Réponse API: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    if (error.response) {
      console.error(`Erreur API ${error.response.status}: ${error.response.config.url}`, error.response.data)

      // Solution de contournement pour les erreurs 422 sur tous les endpoints problématiques
      if (error.response.status === 422) {
        const url = error.response.config.url
        if (
          url.includes("/hardware/brands") ||
          url.includes("/hardware/countries") ||
          url.includes("/shipping-hardware/")
        ) {
          console.log(`Erreur 422 sur ${url} - Retour d'un tableau vide`)
          return Promise.resolve({ data: [] })
        }
      }

      if (error.response.status === 404) {
        const url = error.response.config.url
        if (url.includes("/hardware") && url.includes("/shipping")) {
          console.log(`Erreur 404 sur ${url} - Retour d'un objet vide`)
          return Promise.resolve({ data: { exists: false, message: "Informations de transport non trouvées" } })
        }
      }
    } else if (error.request) {
      console.error("Pas de réponse du serveur:", error.request)
    } else {
      console.error("Erreur de configuration de la requête:", error.message)
    }

    return Promise.reject(error)
  },
)

API.baseURL = baseURL

export default API
