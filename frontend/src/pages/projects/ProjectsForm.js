"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../../services/api"
import "./ProjectsStyles.css"

function ProjectsForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const [formData, setFormData] = useState({
    client: "",
    project_name: "",
    po_client: "",
    montant_po: 0,
    devis_oddnet_final: "",
    montant_devis_final: 0,
    extra_cost: 0,
    status: "En cours",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    description: "",
    opportunity_id: null,
    client_id: null
  })

  const [loading, setLoading] = useState(isEditing)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState([])
  const [opportunities, setOpportunities] = useState([])

  useEffect(() => {
    // Charger les clients et les opportunités
    const fetchData = async () => {
      try {
        const [clientsResponse, opportunitiesResponse] = await Promise.all([
          API.get("/clients/"),
          API.get("/opportunities/")
        ])
        setClients(clientsResponse.data)
        setOpportunities(opportunitiesResponse.data)
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err)
        setError("Impossible de charger les données de référence")
      }
    }

    fetchData()

    if (isEditing) {
      fetchProject()
    }
  }, [id, isEditing])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const response = await API.get(`/projects/${id}`)
      setFormData(response.data)
      setError(null)
    } catch (err) {
      console.error("Erreur de chargement:", err)
      setError("Impossible de charger les données du projet")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Conversion des valeurs numériques
    if (["montant_po", "montant_devis_final", "extra_cost"].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } 
    // Gestion des IDs
    else if (["client_id", "opportunity_id"].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: value ? parseInt(value) : null }))
      
      // Si on sélectionne une opportunité, on pré-remplit les champs
      if (name === "opportunity_id" && value) {
        const selectedOpp = opportunities.find(opp => opp.id === parseInt(value))
        if (selectedOpp) {
          setFormData(prev => ({
            ...prev,
            client: selectedOpp.company_name,
            po_client: selectedOpp.po_number || "",
            montant_po: selectedOpp.montant_devis || 0,
            devis_oddnet_final: selectedOpp.devis_number || "",
            montant_devis_final: selectedOpp.montant_devis || 0,
            description: selectedOpp.project || ""
          }))
        }
      }
      
      // Si on sélectionne un client, on pré-remplit le champ client
      if (name === "client_id" && value) {
        const selectedClient = clients.find(client => client.id === parseInt(value))
        if (selectedClient) {
          setFormData(prev => ({
            ...prev,
            client: selectedClient.company_name
          }))
        }
      }
    } 
    // Autres champs
    else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      
      // Préparation des données pour l'API
      const projectData = {
        ...formData,
        montant_po: parseFloat(formData.montant_po) || 0,
        montant_devis_final: parseFloat(formData.montant_devis_final) || 0,
        extra_cost: parseFloat(formData.extra_cost) || 0,
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        opportunity_id: formData.opportunity_id ? parseInt(formData.opportunity_id) : null
      }
      
      if (isEditing) {
        await API.put(`/projects/${id}`, projectData)
      } else {
        await API.post("/projects/", projectData)
      }
      navigate("/dashboard/projects")
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
      <div className="projects-loading">
        <div className="projects-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <div>
          <h1>
            <i className={`fas ${isEditing ? "fa-edit" : "fa-plus-circle"} me-3`}></i>
            {isEditing ? "Modifier le projet" : "Ajouter un nouveau projet"}
          </h1>
          <p>{isEditing ? "Mettez à jour les informations" : "Remplissez le formulaire"}</p>
        </div>
        <button className="projects-btn projects-btn-secondary" onClick={() => navigate("/dashboard/projects")}>
          <i className="fas fa-arrow-left me-2"></i>
          Retour
        </button>
      </div>

      {error && (
        <div className="projects-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <div className="projects-card">
        <form onSubmit={handleSubmit} className="projects-form">
          <div className="form-grid">
            {/* Colonne 1 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-info-circle me-2"></i>Informations générales
                </h3>

                {/* Sélection d'opportunité */}
                <div className="form-group">
                  <label htmlFor="opportunity_id">Opportunité liée</label>
                  <div className="input-wrapper">
                    <i className="fas fa-lightbulb"></i>
                    <select 
                      id="opportunity_id" 
                      name="opportunity_id" 
                      value={formData.opportunity_id || ""} 
                      onChange={handleChange}
                    >
                      <option value="">-- Sélectionner une opportunité --</option>
                      {opportunities
                        .filter(opp => opp.current_step === "PO Client" || opp.current_step === "Converti en projet")
                        .map(opp => (
                          <option key={opp.id} value={opp.id}>
                            {opp.company_name} - {opp.reference_project || opp.devis_number}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {/* Sélection de client */}
                <div className="form-group">
                  <label htmlFor="client_id">Client lié</label>
                  <div className="input-wrapper">
                    <i className="fas fa-building"></i>
                    <select 
                      id="client_id" 
                      name="client_id" 
                      value={formData.client_id || ""} 
                      onChange={handleChange}
                    >
                      <option value="">-- Sélectionner un client --</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {renderField({
                  name: "client",
                  label: "Nom du client",
                  icon: "user-tie",
                  required: true,
                  placeholder: "Ex: Société ABC"
                })}

                {renderField({
                  name: "project_name",
                  label: "Nom du projet",
                  icon: "project-diagram",
                  required: true,
                  placeholder: "Ex: Déploiement infrastructure réseau"
                })}

                {renderField({
                  name: "description",
                  label: "Description",
                  type: "textarea",
                  icon: "align-left",
                  placeholder: "Description détaillée du projet..."
                })}
              </div>

              <div className="form-section">
                <h3>
                  <i className="fas fa-calendar-alt me-2"></i>Dates et statut
                </h3>

                {renderField({
                  name: "start_date",
                  label: "Date de début",
                  type: "date",
                  icon: "calendar-day",
                  required: true
                })}

                {renderField({
                  name: "end_date",
                  label: "Date de fin prévue",
                  type: "date",
                  icon: "calendar-check"
                })}

                {renderField({
                  name: "status",
                  label: "Statut",
                  type: "select",
                  icon: "tasks",
                  required: true,
                  options: [
                    { value: "En cours", label: "En cours" },
                    { value: "En attente", label: "En attente" },
                    { value: "Terminé", label: "Terminé" }
                  ]
                })}
              </div>
            </div>

            {/* Colonne 2 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-file-invoice-dollar me-2"></i>Informations financières
                </h3>

                {renderField({
                  name: "po_client",
                  label: "Numéro PO client",
                  icon: "file-contract",
                  placeholder: "Ex: PO-2023-001"
                })}

                {renderField({
                  name: "montant_po",
                  label: "Montant PO (MAD)",
                  type: "number",
                  icon: "money-bill-wave",
                  placeholder: "Ex: 100000"
                })}

                {renderField({
                  name: "devis_oddnet_final",
                  label: "Référence devis Oddnet",
                  icon: "file-invoice",
                  placeholder: "Ex: DEV-2023-001"
                })}

                {renderField({
                  name: "montant_devis_final",
                  label: "Montant devis final (MAD)",
                  type: "number",
                  icon: "money-check-alt",
                  placeholder: "Ex: 100000"
                })}

                {renderField({
                  name: "extra_cost",
                  label: "Coûts supplémentaires (MAD)",
                  type: "number",
                  icon: "coins",
                  placeholder: "Ex: 5000"
                })}
              </div>

              <div className="form-tips">
                <h3>
                  <i className="fas fa-lightbulb me-2"></i>Conseils
                </h3>
                <ul>
                  <li>
                    <i className="fas fa-check-circle"></i>Sélectionnez une opportunité pour pré-remplir les champs
                  </li>
                  <li>
                    <i className="fas fa-check-circle"></i>Mettez à jour régulièrement le statut du projet
                  </li>
                  <li>
                    <i className="fas fa-check-circle"></i>Indiquez les coûts supplémentaires pour un suivi précis
                  </li>
                  <li>
                    <i className="fas fa-check-circle"></i>Ajoutez une date de fin pour planifier vos ressources
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="projects-btn projects-btn-secondary"
              onClick={() => navigate("/dashboard/projects")}
              disabled={saving}
            >
              <i className="fas fa-times me-2"></i>
              Annuler
            </button>
            <button type="submit" className="projects-btn projects-btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <div className="projects-spinner-sm"></div>
                  {isEditing ? "Mise à jour..." : "Création..."}
                </>
              ) : (
                <>
                  <i className={`fas ${isEditing ? "fa-save" : "fa-plus-circle"} me-2`}></i>
                  {isEditing ? "Mettre à jour" : "Créer le projet"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectsForm