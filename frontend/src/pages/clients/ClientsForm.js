"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import API from "../../services/api"
import "./ClientsStyles.css"

function ClientsForm() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const isEditing = !!id

  const [formData, setFormData] = useState({
    company_name: "",
    sector_field: "",
    contact_name: "",
    contact_position: "",
    phone: "",
    email: "",
    country: "",
    address: "",
    payment_terms: "",
    invoice_terms: "",
    currency: "MAD",
    is_zone_franche: "NON",
  })

  const [loading, setLoading] = useState(isEditing)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Édition ou conversion d'une opportunité préremplie
    if (isEditing) {
      fetchClient()
    } else if (location.state && location.state.opportunityData) {
      const { opportunityData } = location.state
      setFormData((prev) => ({
        ...prev,
        company_name: opportunityData.company_name || "",
        contact_name: opportunityData.contact_name || "",
        contact_position: opportunityData.contact_position || "",
        email: opportunityData.email || "",
        phone: opportunityData.phone || "",
        country: opportunityData.country || "",
        sector_field: opportunityData.sector_field || "",
      }))
    }
  }, [id, isEditing, location.state])

  const fetchClient = async () => {
    try {
      setLoading(true)
      const response = await API.get(`/clients/${id}`)
      setFormData(response.data)
      setError(null)
    } catch (err) {
      console.error("Erreur de chargement:", err)
      setError("Impossible de charger les données du client")
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
        await API.put(`/clients/${id}`, formData)
      } else {
        await API.post(`/clients`, formData)
      }
      navigate("/dashboard/clients")
    } catch (err) {
      console.error("Erreur d'enregistrement:", err)
      setError("Une erreur est survenue lors de l'enregistrement")
      setSaving(false)
    }
  }

  // Fonction pour générer un champ de formulaire
  const renderField = ({ name, label, type = "text", icon, required = false, options, placeholder }) => {
    const isSelect = type === "select"
    const isTextarea = type === "textarea"
    const isRadio = type === "radio"

    if (isRadio) {
      return (
        <div className="form-group">
          <label htmlFor={name}>
            {label} {required && <span className="required">*</span>}
          </label>
          <div className="radio-group">
            {options.map((opt) => (
              <div key={opt.value} className="radio-item">
                <input
                  type="radio"
                  id={`${name}_${opt.value}`}
                  name={name}
                  value={opt.value}
                  checked={formData[name] === opt.value}
                  onChange={handleChange}
                  required={required}
                />
                <label htmlFor={`${name}_${opt.value}`}>{opt.label}</label>
              </div>
            ))}
          </div>
        </div>
      )
    }

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
      <div className="clients-loading">
        <div className="clients-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  return (
    <div className="clients-container">
      <div className="clients-header">
        <div>
          <h1>
            <i className={`fas ${isEditing ? "fa-edit" : "fa-plus-circle"} me-3`}></i>
            {isEditing ? "Modifier le client" : "Ajouter un nouveau client"}
          </h1>
          <p>{isEditing ? "Mettez à jour les informations" : "Remplissez le formulaire"}</p>
        </div>
        <button className="clients-btn clients-btn-secondary" onClick={() => navigate("/dashboard/clients")}>
          <i className="fas fa-arrow-left me-2"></i>
          Retour
        </button>
      </div>

      {error && (
        <div className="clients-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <div className="clients-card">
        <form onSubmit={handleSubmit} className="clients-form">
          <div className="form-grid">
            {/* Colonne 1 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-building me-2"></i>Informations de l'entreprise
                </h3>

                {renderField({
                  name: "company_name",
                  label: "Nom de la société",
                  icon: "building",
                  required: true,
                  placeholder: "Nom de la société",
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

                {renderField({
                  name: "country",
                  label: "Pays",
                  icon: "globe-africa",
                  placeholder: "Ex: Morocco",
                })}

                {renderField({
                  name: "address",
                  label: "Adresse",
                  type: "textarea",
                  icon: "map-marker-alt",
                  placeholder: "Adresse complète",
                })}
              </div>

              <div className="form-section">
                <h3>
                  <i className="fas fa-file-invoice-dollar me-2"></i>Informations financières
                </h3>

                {renderField({
                  name: "payment_terms",
                  label: "Conditions de paiement",
                  icon: "money-check-alt",
                  placeholder: "Ex: 30 jours",
                })}

                {renderField({
                  name: "invoice_terms",
                  label: "Termes de facturation",
                  icon: "file-invoice",
                  placeholder: "Ex: Facturation mensuelle",
                })}

                {renderField({
                  name: "currency",
                  label: "Devise",
                  type: "select",
                  icon: "money-bill-wave",
                  options: [
                    { value: "MAD", label: "MAD" },
                    { value: "EUR", label: "EUR" },
                    { value: "USD", label: "USD" },
                  ],
                })}

                {renderField({
                  name: "is_zone_franche",
                  label: "Zone Franche",
                  type: "radio",
                  options: [
                    { value: "OUI", label: "OUI" },
                    { value: "NON", label: "NON" },
                  ],
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

              <div className="form-tips">
                <h3>
                  <i className="fas fa-lightbulb me-2"></i>Conseils
                </h3>
                <ul>
                  <li>
                    <i className="fas fa-check-circle"></i>Renseignez le maximum d'informations pour faciliter la
                    gestion
                  </li>
                  <li>
                    <i className="fas fa-check-circle"></i>Les conditions de paiement sont importantes pour la
                    facturation
                  </li>
                  <li>
                    <i className="fas fa-check-circle"></i>Vérifiez le statut de zone franche pour les aspects fiscaux
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="clients-btn clients-btn-secondary"
              onClick={() => navigate("/dashboard/clients")}
              disabled={saving}
            >
              <i className="fas fa-times me-2"></i>
              Annuler
            </button>
            <button type="submit" className="clients-btn clients-btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <div className="clients-spinner-sm"></div>
                  {isEditing ? "Mise à jour..." : "Création..."}
                </>
              ) : (
                <>
                  <i className={`fas ${isEditing ? "fa-save" : "fa-plus-circle"} me-2`}></i>
                  {isEditing ? "Mettre à jour" : "Créer le client"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClientsForm
