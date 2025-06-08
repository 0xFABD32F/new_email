"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { login } from "../../services/auth"
import "./Auth.css"

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!formData.email || !formData.password) {
        setError("Veuillez remplir tous les champs")
        setLoading(false)
        return
      }

      const response = await login(formData.email, formData.password)
      console.log("Utilisateur connecté :", response.data)

      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(response.data))

      // Navigate to dashboard
      navigate("/dashboard", { replace: true })
    } catch (error) {
      console.error("Erreur de connexion :", error)
      if (error.response?.status === 400) {
        setError("Email ou mot de passe incorrect")
      } else {
        setError("Erreur serveur. Veuillez réessayer.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <Link to="/" className="auth-logo">
              OddnetCRM
            </Link>
            <h1>Connexion</h1>
            <p>Connectez-vous pour accéder à votre espace de travail</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="votre@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="form-check">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <label htmlFor="rememberMe">Se souvenir de moi</label>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Vous n'avez pas de compte ?{" "}
              <Link to="/register" className="auth-link">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
