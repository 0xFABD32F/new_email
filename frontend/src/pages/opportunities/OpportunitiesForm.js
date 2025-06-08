"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../../services/api"
import "./OpportunitiesStyles.css"

function OpportunitiesForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const [formData, setFormData] = useState({
    reference_project: "",
    company_name: "",
    country: "",
    contact_name: "",
    contact_position: "",
    email: "",
    phone: "",
    sector_field: "",
    project: "",
    current_step: "Demande de devis",
    current_step_date: new Date().toISOString().split("T")[0],
    devis_number: "",
    montant_devis: "",
    client_deadline: "",
    // po_number: "",
  })

  const [loading, setLoading] = useState(isEditing)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEditing) {
      fetchOpportunity()
    }
  }, [id, isEditing])

  const fetchOpportunity = async () => {
    try {
      setLoading(true)
      const response = await API.get(`/opportunities/${id}`)
      setFormData(response.data)
      setError(null)
    } catch (err) {
      console.error("Erreur de chargement:", err)
      setError("Impossible de charger les données de l'opportunité")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      if (isEditing) {
        await API.put(`/opportunities/${id}`, formData)
      } else {
        await API.post("/opportunities/", formData)
      }
      navigate("/dashboard/opportunities")
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error)
      setError("Une erreur est survenue lors de l'enregistrement")
      setSaving(false)
    }
  }

  // Fonction pour générer un champ de formulaire
  const renderField = ({ name, label, type = "text", icon, required = false, options, placeholder }) => {
    const isSelect = type === "select"
    const isTextarea = type === "textarea"

    return (
      <div className="form-group">
        <label htmlFor={name}>
          {label} {required && <span className="required">*</span>}
        </label>
        <div className="input-wrapper">
          {icon && <i className={`fas fa-${icon}`}></i>}

          {isSelect ? (
            <select id={name} name={name} value={formData[name]} onChange={handleChange} required={required}>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : isTextarea ? (
            <textarea
              id={name}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              placeholder={placeholder}
              rows="4"
            />
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

  if (loading) {
    return (
      <div className="opp-loading">
        <div className="opp-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  return (
    <div className="opp-container">
      <div className="opp-header">
        <div>
          <h1>
            <i className={`fas ${isEditing ? "fa-edit" : "fa-plus-circle"} me-3`}></i>
            {isEditing ? "Modifier l'opportunité" : "Ajouter une nouvelle opportunité"}
          </h1>
          <p>{isEditing ? "Mettez à jour les informations" : "Remplissez le formulaire"}</p>
        </div>
        <button className="opp-btn opp-btn-secondary" onClick={() => navigate("/dashboard/opportunities")}>
          <i className="fas fa-arrow-left me-2"></i>
          Retour
        </button>
      </div>

      {error && (
        <div className="opp-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <div className="opp-card">
        <form onSubmit={handleSubmit} className="opp-form">
          <div className="form-grid">
            {/* Colonne 1 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-building me-2"></i>Informations de l'entreprise
                </h3>

                {renderField({
                  name: "reference_project",
                  label: "Référence Projet",
                  icon: "hashtag",
                  placeholder: "Ex: OPP-2023-001",
                })}

                {renderField({
                  name: "company_name",
                  label: "Nom de la société",
                  icon: "building",
                  required: true,
                  placeholder: "Nom de la société",
                })}

                {renderField({
                  name: "country",
                  label: "Pays",
                  icon: "globe-africa",
                  placeholder: "Ex: Morocco",
                })}

                {renderField({
                  name: "sector_field",
                  label: "Domaine d'activité",
                  type: "select",
                  icon: "industry",
                  options: [
                    { value: "", label: "Sélectionnez un domaine" },
                    { value: "Cybersecurity", label: "Cybersecurity" },
                    { value: "Networking", label: "Networking" },
                    { value: "Cloud", label: "Cloud" },
                    { value: "Datacenter", label: "Datacenter" },
                    { value: "Télécommunications", label: "Télécommunications" },
                    { value: "Hardware", label: "Hardware" },
                  ],
                })}
              </div>

              <div className="form-section">
                <h3>
                  <i className="fas fa-clipboard-list me-2"></i>Détails du projet
                </h3>

                {renderField({
                  name: "project",
                  label: "Description du projet",
                  type: "textarea",
                  placeholder: "Décrivez le projet...",
                })}

                {renderField({
                  name: "current_step",
                  label: "Étape actuelle",
                  type: "select",
                  icon: "tasks",
                  options: [
                    { value: "définition besoin", label: "Définition besoin" },
                    { value: "Demande de devis", label: "Demande de devis" },
                    { value: "Réception de devis", label: "Réception de devis" },
                    { value: "Clarification", label: "Clarification" },
                    { value: "Offre Oddnet", label: "Offre Oddnet" },
                    { value: "PO Client", label: "PO Client" },
                  ],
                })}

                {renderField({
                  name: "current_step_date",
                  label: "Date de l'étape",
                  type: "date",
                  icon: "calendar-alt",
                })}
              </div>
            </div>

            {/* Colonne 2 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-user me-2"></i>Informations de contact
                </h3>

                {renderField({
                  name: "contact_name",
                  label: "Nom du contact",
                  icon: "user",
                  required: true,
                  placeholder: "Nom du contact",
                })}

                {renderField({
                  name: "contact_position",
                  label: "Poste du contact",
                  icon: "id-badge",
                  placeholder: "Ex: Directeur IT",
                })}

                {renderField({
                  name: "email",
                  label: "Email",
                  type: "email",
                  icon: "envelope",
                  placeholder: "Ex: contact@entreprise.com",
                })}

                {renderField({
                  name: "phone",
                  label: "Téléphone",
                  icon: "phone",
                  placeholder: "Ex: +212 5XX XX XX XX",
                })}
              </div>

              <div className="form-section">
                <h3>
                  <i className="fas fa-file-invoice-dollar me-2"></i>Informations financières
                </h3>

                {renderField({
                  name: "devis_number",
                  label: "N° Devis",
                  icon: "file-invoice",
                  placeholder: "Ex: DEV-2023-001",
                })}

                {renderField({
                  name: "montant_devis",
                  label: "Montant devis (MAD)",
                  type: "number",
                  icon: "money-bill-wave",
                  placeholder: "Ex: 10000",
                })}

                {renderField({
                  name: "client_deadline",
                  label: "Deadline client",
                  type: "datetime-local",
                  icon: "clock",
                })}

                {/* {renderField({
                  name: "po_number",
                  label: "N° PO / Offre",
                  icon: "file-contract",
                  placeholder: "Ex: PO-2023-001",
                })} */}
              </div>

              <div className="form-tips">
                <h3>
                  <i className="fas fa-lightbulb me-2"></i>Conseils
                </h3>
                <ul>
                  <li>
                    <i className="fas fa-check-circle"></i>Renseignez le maximum d'informations
                  </li>
                  <li>
                    <i className="fas fa-check-circle"></i>Mettez à jour régulièrement l'étape
                  </li>
                  <li>
                    <i className="fas fa-check-circle"></i>Une opportunité à l'étape "PO Client" peut être convertie en
                    client
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="opp-btn opp-btn-secondary"
              onClick={() => navigate("/dashboard/opportunities")}
              disabled={saving}
            >
              <i className="fas fa-times me-2"></i>
              Annuler
            </button>
            <button type="submit" className="opp-btn opp-btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <div className="opp-spinner-sm"></div>
                  {isEditing ? "Mise à jour..." : "Création..."}
                </>
              ) : (
                <>
                  <i className={`fas ${isEditing ? "fa-save" : "fa-plus-circle"} me-2`}></i>
                  {isEditing ? "Mettre à jour" : "Créer l'opportunité"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OpportunitiesForm
