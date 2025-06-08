"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../../services/api"
import "./LeadsStyles.css"

function LeadsForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id
  const [loading, setLoading] = useState(isEditing)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState([])

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
    current_step: "First Call",
    current_step_date: new Date().toISOString().split("T")[0],
    status: "Nouveau",
    client_id: "", // New field to store the selected client ID
  })

  useEffect(() => {
    // Fetch clients for the dropdown
    const fetchClients = async () => {
      try {
        const response = await API.get("/clients/")
        setClients(response.data)
      } catch (err) {
        console.error("Erreur lors du chargement des clients:", err)
      }
    }

    fetchClients()

    if (isEditing) {
      fetchLead()
    }
  }, [id])

  const fetchLead = async () => {
    try {
      setLoading(true)
      const response = await API.get(`/leads/${id}`)
      setFormData(response.data)
      setError(null)
    } catch (error) {
      console.error("Erreur de chargement du lead:", error)
      setError("Impossible de charger les données du lead")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === "client_id" && value) {
      // When a client is selected, auto-populate the form with client data
      const selectedClient = clients.find((client) => client.id === Number.parseInt(value))
      if (selectedClient) {
        setFormData((prev) => ({
          ...prev,
          client_id: value,
          company_name: selectedClient.company_name,
          country: selectedClient.country,
          contact_name: selectedClient.contact_name,
          contact_position: selectedClient.contact_position,
          email: selectedClient.email,
          phone: selectedClient.phone,
          sector_field: selectedClient.sector_field,
          // Generate a reference based on client name
          reference_project: `${selectedClient.company_name.substring(0, 3).toUpperCase()}${new Date().getFullYear().toString().substring(2)}-${Math.floor(
            Math.random() * 1000,
          )
            .toString()
            .padStart(3, "0")}`,
        }))
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      if (isEditing) {
        await API.put(`/leads/${id}`, formData)
      } else {
        await API.post("/leads/", formData)
      }
      navigate("/dashboard/leads")
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
      <div className="leads-loading">
        <div className="leads-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  return (
    <div className="leads-container">
      <div className="leads-header">
        <div>
          <h1>
            <i className={`fas ${isEditing ? "fa-edit" : "fa-plus-circle"} me-3`}></i>
            {isEditing ? "Modifier le lead" : "Ajouter un nouveau lead"}
          </h1>
          <p>{isEditing ? "Mettez à jour les informations" : "Remplissez le formulaire"}</p>
        </div>
        <button className="leads-btn leads-btn-secondary" onClick={() => navigate("/dashboard/leads")}>
          <i className="fas fa-arrow-left me-2"></i>
          Retour
        </button>
      </div>

      {error && (
        <div className="leads-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <div className="leads-card">
        <form onSubmit={handleSubmit} className="leads-form">
          <div className="form-grid">
            {/* Colonne 1 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-building me-2"></i>Informations de l'entreprise
                </h3>

                {/* Client dropdown - NEW */}
                <div className="form-group">
                  <label htmlFor="client_id">Sélectionner un client existant</label>
                  <div className="input-wrapper">
                    <i className="fas fa-users"></i>
                    <select id="client_id" name="client_id" value={formData.client_id} onChange={handleChange}>
                      <option value="">-- Sélectionner un client --</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {renderField({
                  name: "reference_project",
                  label: "Référence Projet",
                  icon: "hashtag",
                  placeholder: "Ex: AJR01-2025",
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
                    { value: "First Call", label: "First Call" },
                    { value: "First meeting", label: "First meeting" },
                    { value: "Reunion Expert IT", label: "Reunion Expert IT" },
                    { value: "Envoie Draft", label: "Envoie Draft" },
                    { value: "Reception Draft", label: "Reception Draft" },
                    { value: "Demande devis", label: "Demande devis" },
                  ],
                })}

                {renderField({
                  name: "current_step_date",
                  label: "Date de l'étape",
                  type: "date",
                  icon: "calendar-alt",
                })}

                {renderField({
                  name: "status",
                  label: "Statut",
                  type: "select",
                  icon: "flag",
                  options: [
                    { value: "Nouveau", label: "Nouveau" },
                    { value: "En cours", label: "En cours" },
                    { value: "Terminé", label: "Terminé" },
                    { value: "Perdu", label: "Perdu" },
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
                    <i className="fas fa-check-circle"></i>Sélectionnez un client existant pour remplir automatiquement
                    les informations
                  </li>
                  <li>
                    <i className="fas fa-check-circle"></i>Renseignez le maximum d'informations
                  </li>
                  <li>
                    <i className="fas fa-check-circle"></i>Mettez à jour régulièrement l'étape
                  </li>
                  <li>
                    <i className="fas fa-check-circle"></i>Un lead à l'étape "Demande devis" peut être converti
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="leads-btn leads-btn-secondary"
              onClick={() => navigate("/dashboard/leads")}
              disabled={saving}
            >
              <i className="fas fa-times me-2"></i>
              Annuler
            </button>
            <button type="submit" className="leads-btn leads-btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <div className="leads-spinner-sm"></div>
                  {isEditing ? "Mise à jour..." : "Création..."}
                </>
              ) : (
                <>
                  <i className={`fas ${isEditing ? "fa-save" : "fa-plus-circle"} me-2`}></i>
                  {isEditing ? "Mettre à jour" : "Créer le lead"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LeadsForm
