"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { userService } from "../../services/userService"
import { isAuthenticated, getCurrentUserName } from "../../services/auth"
import "./UserProfile.css"

const UserProfile = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    phone: "",
    role: "",
    droit_acces: "",
  })
  const [saving, setSaving] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  })
  const navigate = useNavigate()

  useEffect(() => {
    // Vérifier l'authentification avant de charger le profil
    if (!isAuthenticated()) {
      console.log("Utilisateur non authentifié, redirection vers login")
      navigate("/login")
      return
    }

    loadUserProfile()
  }, [navigate])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      setError("")

      // Vérifier d'abord si l'utilisateur est connecté
      if (!userService.isLoggedIn()) {
        throw new Error("Utilisateur non connecté")
      }

      // Essayer de charger depuis l'API
      const response = await userService.getCurrentUser()
      setUser(response.data)
      setFormData({
        nom: response.data.nom || "",
        email: response.data.email || "",
        phone: response.data.phone || "",
        role: response.data.role || "",
        droit_acces: response.data.droit_acces || "",
      })
    } catch (error) {
      console.error("Erreur lors du chargement du profil:", error)

      if (
        error.message === "Utilisateur non connecté - userId manquant" ||
        error.message === "Utilisateur non connecté - token manquant"
      ) {
        setError("Session expirée. Veuillez vous reconnecter.")
        setTimeout(() => navigate("/login"), 2000)
        return
      }

      if (error.response?.status === 401 || error.response?.status === 404) {
        setError("Session expirée. Redirection vers la page de connexion...")
        setTimeout(() => navigate("/login"), 2000)
        return
      }

      // Essayer d'utiliser les informations stockées localement
      const storedInfo = userService.getStoredUserInfo()
      if (storedInfo.userId) {
        const fallbackUser = {
          id: storedInfo.userId,
          nom: getCurrentUserName() || "Utilisateur",
          email: storedInfo.email || "",
          phone: "",
          role: storedInfo.role || "",
          droit_acces: storedInfo.droitAcces || "",
        }
        setUser(fallbackUser)
        setFormData({
          nom: fallbackUser.nom,
          email: fallbackUser.email,
          phone: fallbackUser.phone,
          role: fallbackUser.role,
          droit_acces: fallbackUser.droit_acces,
        })
        setError("Informations chargées depuis le cache local. Certaines données peuvent ne pas être à jour.")
      } else {
        setError("Impossible de charger les informations du profil")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError("")

      await userService.updateCurrentUser(formData)

      // Mettre à jour localStorage avec les nouvelles informations
      localStorage.setItem("userName", formData.nom)
      localStorage.setItem("userEmail", formData.email)

      await loadUserProfile() // Recharger les données
      setIsEditing(false)
      alert("Profil mis à jour avec succès")
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error)
      if (error.response?.status === 401) {
        setError("Session expirée. Veuillez vous reconnecter.")
        setTimeout(() => navigate("/login"), 2000)
      } else {
        setError("Erreur lors de la mise à jour du profil")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères")
      return
    }

    try {
      setSaving(true)
      setError("")

      // Appeler directement la mise à jour sans vérifier l'ancien mot de passe
      await userService.updateCurrentUser({
        ...formData,
        mot_de_passe: passwordData.newPassword,
      })

      setShowPasswordForm(false)
      setPasswordData({
        newPassword: "",
        confirmPassword: "",
      })
      alert("Mot de passe modifié avec succès")
    } catch (error) {
      console.error("Erreur lors du changement de mot de passe:", error)
      if (error.response?.status === 401) {
        setError("Session expirée. Veuillez vous reconnecter.")
        setTimeout(() => navigate("/login"), 2000)
      } else {
        setError("Erreur lors du changement de mot de passe")
      }
    } finally {
      setSaving(false)
    }
  }

  const getRoleDisplayName = (role) => {
    const roleMap = {
      admin: "Administrateur",
      expert: "Expert",
      ceo: "CEO",
      user: "Utilisateur",
    }
    return roleMap[role?.toLowerCase()] || role || "Utilisateur"
  }

  const getDroitAccesDisplayName = (droit) => {
    const droitMap = {
      ADMIN: "Administration complète",
      EXPERT: "Accès expert",
      USER: "Accès utilisateur",
      READ_ONLY: "Lecture seule",
    }
    return droitMap[droit] || droit || "Non défini"
  }

  const getUserInitials = (name) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Chargement du profil...</p>
      </div>
    )
  }

  if (!user && !error) {
    return (
      <div className="profile-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Erreur</h3>
        <p>Impossible de charger les informations du profil</p>
        <button onClick={() => navigate("/dashboard")} className="btn btn-primary">
          Retour au tableau de bord
        </button>
      </div>
    )
  }

  return (
    <div className="user-profile">
      {/* Header du profil */}
      <div className="profile-header">
        <div className="profile-header-content">
          <div className="profile-avatar-large">{getUserInitials(user?.nom)}</div>
          <div className="profile-header-info">
            <h1 className="profile-name">{user?.nom || "Utilisateur"}</h1>
            <p className="profile-role">{getRoleDisplayName(user?.role)}</p>
            <p className="profile-email">{user?.email || "Email non disponible"}</p>
          </div>
        </div>
        <div className="profile-header-actions">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="btn btn-primary">
              <i className="fas fa-edit"></i>
              Modifier le profil
            </button>
          ) : (
            <div className="edit-actions">
              <button onClick={() => setIsEditing(false)} className="btn btn-secondary" disabled={saving}>
                Annuler
              </button>
              <button onClick={handleSaveProfile} className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      <div className="profile-content">
        <div className="profile-grid">
          {/* Informations personnelles */}
          <div className="profile-card">
            <div className="card-header">
              <h3>
                <i className="fas fa-user"></i>
                Informations personnelles
              </h3>
            </div>
            <div className="card-body">
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="profile-form">
                  <div className="form-group">
                    <label htmlFor="nom">
                      <i className="fas fa-user"></i>
                      Nom complet
                    </label>
                    <input
                      type="text"
                      id="nom"
                      name="nom"
                      value={formData.nom}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">
                      <i className="fas fa-envelope"></i>
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">
                      <i className="fas fa-phone"></i>
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </form>
              ) : (
                <div className="profile-info">
                  <div className="info-item">
                    <label>
                      <i className="fas fa-user"></i>
                      Nom complet
                    </label>
                    <span>{user?.nom || "Non renseigné"}</span>
                  </div>

                  <div className="info-item">
                    <label>
                      <i className="fas fa-envelope"></i>
                      Email
                    </label>
                    <span>{user?.email || "Non renseigné"}</span>
                  </div>

                  <div className="info-item">
                    <label>
                      <i className="fas fa-phone"></i>
                      Téléphone
                    </label>
                    <span>{user?.phone || "Non renseigné"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informations système */}
          <div className="profile-card">
            <div className="card-header">
              <h3>
                <i className="fas fa-cog"></i>
                Informations système
              </h3>
            </div>
            <div className="card-body">
              <div className="profile-info">
                <div className="info-item">
                  <label>
                    <i className="fas fa-briefcase"></i>
                    Rôle
                  </label>
                  <span className="role-badge">{getRoleDisplayName(user?.role)}</span>
                </div>

                <div className="info-item">
                  <label>
                    <i className="fas fa-shield-alt"></i>
                    Droits d'accès
                  </label>
                  <span className="access-badge">{getDroitAccesDisplayName(user?.droit_acces)}</span>
                </div>

                <div className="info-item">
                  <label>
                    <i className="fas fa-key"></i>
                    Identifiant
                  </label>
                  <span>#{user?.id || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sécurité */}
          <div className="profile-card">
            <div className="card-header">
              <h3>
                <i className="fas fa-lock"></i>
                Sécurité
              </h3>
            </div>
            <div className="card-body">
              {!showPasswordForm ? (
                <div className="security-info">
                  <div className="info-item">
                    <label>
                      <i className="fas fa-key"></i>
                      Mot de passe
                    </label>
                    <span>••••••••</span>
                  </div>
                  <button onClick={() => setShowPasswordForm(true)} className="btn btn-outline">
                    <i className="fas fa-edit"></i>
                    Changer le mot de passe
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="password-form">
                  <div className="form-group">
                    <label htmlFor="newPassword">
                      <i className="fas fa-key"></i>
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="form-control"
                      required
                      minLength="6"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">
                      <i className="fas fa-check"></i>
                      Confirmer le mot de passe
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="form-control"
                      required
                      minLength="6"
                    />
                  </div>

                  <div className="password-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false)
                        setPasswordData({
                          newPassword: "",
                          confirmPassword: "",
                        })
                        setError("")
                      }}
                      className="btn btn-secondary"
                      disabled={saving}
                    >
                      Annuler
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Modification...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save"></i>
                          Modifier
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
