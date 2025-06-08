"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../../services/api"
import "./UserStyles.css"

function UsersForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id
  const [loading, setLoading] = useState(isEditing)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [formData, setFormData] = useState({
    nom: "",
    role: "",
    email: "",
    phone: "",
    droit_acces: "",
    password: "",
  })

  // All hooks must be called at the top level
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"))
    setCurrentUser(user)

    if (isEditing) {
      fetchUser() // Fetch user data immediately without checking role
    }
  }, [id, isEditing])

  const fetchUser = async () => {
    try {
      setLoading(true)
      const response = await API.get(`/auth/users/${id}`)
      setFormData({
        nom: response.data.nom || "",
        role: response.data.role || "",
        email: response.data.email || "",
        phone: response.data.phone || "",
        droit_acces: response.data.droit_acces || "",
        password: "",
      })
    } catch (err) {
      console.error("Erreur lors du chargement:", err)
      setError("Impossible de charger les données de l'utilisateur")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      // Adapter les données pour l'API
      const apiData = {
        nom: formData.nom,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        droit_acces: formData.droit_acces,
        mot_de_passe: formData.password || undefined,
      }

      if (isEditing) {
        await API.put(`/auth/${id}`, apiData) // Correction de la route pour l'édition
      } else {
        await API.post("/auth/", apiData) // Correction de la route pour la création
      }
      navigate("/dashboard/users")
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err)
      setError(`Erreur lors de l'enregistrement: ${err.response?.data?.detail || err.message}`)
      setSaving(false)
    }
  }

  // Fonction pour générer un champ de formulaire
  const renderField = ({ name, label, type = "text", icon, required = false, options = [], placeholder }) => {
    const isSelect = type === "select"

    return (
      <div className="form-group">
        <label htmlFor={name}>
          {label} {required && <span className="required">*</span>}
        </label>
        <div className="input-wrapper">
          {icon && <i className={`fas fa-${icon}`}></i>}

          {isSelect ? (
            <select id={name} name={name} value={formData[name]} onChange={handleChange} required={required}>
              <option value="">Sélectionner...</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              id={name}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              placeholder={placeholder}
              required={required}
            />
          )}
        </div>
      </div>
    )
  }

  // Afficher l'état de chargement
  if (loading) {
    return (
      <div className="u-loading">
        <div className="u-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  return (
    <div className="u-container">
      {/* En-tête */}
      <div className="u-header">
        <div>
          <h1>
            <i className={`fas ${isEditing ? "fa-user-edit" : "fa-user-plus"} me-3`}></i>
            {isEditing ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}
          </h1>
          <p>{isEditing ? "Mettre à jour les informations" : "Créer un nouveau compte"}</p>
        </div>
        <button className="u-btn u-btn-secondary" onClick={() => navigate("/dashboard/users")}>
          <i className="fas fa-arrow-left me-2"></i>Retour
        </button>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="u-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      {/* Formulaire */}
      <div className="u-card">
        <form onSubmit={handleSubmit} className="u-form">
          <div className="form-grid">
            {/* Colonne 1 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-user-circle me-2"></i>Informations
                </h3>

                {renderField({
                  name: "nom",
                  label: "Nom",
                  icon: "user",
                  required: true,
                  placeholder: "Nom complet",
                })}

                {renderField({
                  name: "role",
                  label: "Rôle",
                  type: "select",
                  icon: "briefcase",
                  required: true,
                  options: [
                    { value: "CEO", label: "CEO" },
                    { value: "CTO", label: "CTO" },
                    { value: "CSO", label: "CSO" },
                    { value: "Admin", label: "Admin" },
                  ],
                })}

                {renderField({
                  name: "droit_acces",
                  label: "Droits d'accès",
                  type: "select",
                  icon: "lock",
                  required: true,
                  options: [
                    { value: "Admin", label: "Admin" },
                    { value: "Commercial", label: "Commercial" },
                    { value: "Technique", label: "Technique" },
                    { value: "Lecture seule", label: "Lecture seule" },
                  ],
                })}
              </div>
            </div>

            {/* Colonne 2 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-address-card me-2"></i>Contact et authentification
                </h3>

                {renderField({
                  name: "email",
                  label: "Email",
                  type: "email",
                  icon: "envelope",
                  required: true,
                  placeholder: "exemple@domaine.com",
                })}

                {renderField({
                  name: "phone",
                  label: "Téléphone",
                  icon: "phone",
                  required: true,
                  placeholder: "+212 XXXXXXXXX",
                })}

                {renderField({
                  name: "password",
                  label: isEditing ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe",
                  type: "password",
                  icon: "key",
                  required: !isEditing,
                  placeholder: isEditing ? "Nouveau mot de passe" : "Mot de passe",
                })}
              </div>

              <div className="form-tips">
                <h3>
                  <i className="fas fa-info-circle me-2"></i>Informations
                </h3>
                <ul>
                  <li>
                    <i className="fas fa-check-circle"></i>Les droits déterminent les fonctionnalités accessibles
                  </li>
                  <li>
                    <i className="fas fa-check-circle"></i>Mot de passe: minimum 8 caractères
                  </li>
                  <li>
                    <i className="fas fa-check-circle"></i>Email unique requis pour chaque utilisateur
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="form-actions">
            <button
              type="button"
              className="u-btn u-btn-secondary"
              onClick={() => navigate("/dashboard/users")}
              disabled={saving}
            >
              <i className="fas fa-times me-2"></i>Annuler
            </button>
            <button type="submit" className="u-btn u-btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <div className="u-spinner-sm"></div>
                  {isEditing ? "Mise à jour..." : "Création..."}
                </>
              ) : (
                <>
                  <i className={`fas ${isEditing ? "fa-save" : "fa-user-plus"} me-2`}></i>
                  {isEditing ? "Mettre à jour" : "Créer"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UsersForm
