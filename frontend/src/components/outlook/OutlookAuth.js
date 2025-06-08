"use client"

import { useState, useEffect } from "react"

// Configuration de l'authentification Microsoft
const config = {
  clientId: "VOTRE_CLIENT_ID", // À remplacer par votre Client ID Azure
  redirectUri: window.location.origin,
  scopes: ["user.read", "mail.read", "mail.send", "calendars.read", "calendars.readwrite"],
  authority: "https://login.microsoftonline.com/common",
}

function OutlookAuth({ onAuthStateChange }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté (token dans localStorage)
    const token = localStorage.getItem("outlook_token")
    if (token) {
      try {
        const tokenData = JSON.parse(token)
        const now = new Date().getTime()

        // Vérifier si le token n'est pas expiré
        if (tokenData.expiresAt > now) {
          setIsAuthenticated(true)
          setUser(tokenData.user)
          if (onAuthStateChange) onAuthStateChange(true, tokenData.user)
          return
        } else {
          // Token expiré, le supprimer
          localStorage.removeItem("outlook_token")
        }
      } catch (e) {
        localStorage.removeItem("outlook_token")
      }
    }

    // Vérifier si nous revenons d'une redirection OAuth
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get("code")

    if (code) {
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname)

      // Échanger le code contre un token (simulation)
      simulateTokenExchange(code)
        .then((userData) => {
          setIsAuthenticated(true)
          setUser(userData)
          if (onAuthStateChange) onAuthStateChange(true, userData)

          // Stocker le token dans localStorage
          const expiresAt = new Date().getTime() + 3600 * 1000 // 1 heure
          localStorage.setItem(
            "outlook_token",
            JSON.stringify({
              token: "simulated_token",
              expiresAt,
              user: userData,
            }),
          )
        })
        .catch((err) => {
          setError("Erreur d'authentification: " + err.message)
        })
    }
  }, [onAuthStateChange])

  const login = () => {
    // Dans une implémentation réelle, vous utiliseriez MSAL.js
    // Ici, nous simulons la redirection vers Microsoft pour l'authentification
    const authUrl = `${config.authority}/oauth2/v2.0/authorize?client_id=${config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(config.redirectUri)}&scope=${encodeURIComponent(config.scopes.join(" "))}&response_mode=query`

    // Dans un environnement de production, rediriger vers l'URL d'authentification
    // window.location.href = authUrl

    // Pour la démonstration, simuler une authentification réussie
    simulateSuccessfulAuth()
  }

  const logout = () => {
    localStorage.removeItem("outlook_token")
    setIsAuthenticated(false)
    setUser(null)
    if (onAuthStateChange) onAuthStateChange(false, null)
  }

  // Fonction de simulation pour la démonstration
  const simulateSuccessfulAuth = () => {
    const userData = {
      displayName: "John Doe",
      email: "john.doe@example.com",
      userPrincipalName: "john.doe@example.com",
    }

    setIsAuthenticated(true)
    setUser(userData)
    if (onAuthStateChange) onAuthStateChange(true, userData)

    // Stocker le token simulé
    const expiresAt = new Date().getTime() + 3600 * 1000 // 1 heure
    localStorage.setItem(
      "outlook_token",
      JSON.stringify({
        token: "simulated_token",
        expiresAt,
        user: userData,
      }),
    )
  }

  // Fonction de simulation pour la démonstration
  const simulateTokenExchange = (code) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          displayName: "John Doe",
          email: "john.doe@example.com",
          userPrincipalName: "john.doe@example.com",
        })
      }, 500)
    })
  }

  return {
    isAuthenticated,
    user,
    error,
    login,
    logout,
  }
}

export default OutlookAuth
