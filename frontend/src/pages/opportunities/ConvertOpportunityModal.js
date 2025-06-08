"use client"

import { useState, useEffect } from "react"
import API from "../../services/api"
import "./ConvertOpportunityModal.css"

function ConvertOpportunityModal({ show, onClose, opportunityId, onSuccess }) {
  const [formData, setFormData] = useState({
    project_name: "",
    status: "En cours",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    description: "",
    extra_cost: 0,
    po_client: "",
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [opportunityData, setOpportunityData] = useState(null)

  // Charger les données de l'opportunité quand le modal s'ouvre
  useEffect(() => {
    if (show && opportunityId) {
      const fetchOpportunityData = async () => {
        try {
          const response = await API.get(`/opportunities/${opportunityId}`)
          setOpportunityData(response.data)

          // Pré-remplir le nom du projet avec le projet de l'opportunité
          if (response.data.project) {
            setFormData((prev) => ({
              ...prev,
              project_name: response.data.project,
            }))
          }
        } catch (error) {
          console.error("Erreur lors du chargement de l'opportunité:", error)
        }
      }

      fetchOpportunityData()
    }
  }, [show, opportunityId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.project_name.trim()) {
      newErrors.project_name = "Le nom du projet est requis"
    }
    if (!formData.po_client.trim()) {
      newErrors.po_client = "Le numéro PO client est requis"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    try {
      const dataToSend = {
        ...formData,
        extra_cost: Number.parseFloat(formData.extra_cost) || 0,
        // S'assurer que les dates sont au bon format
        start_date: formData.start_date || new Date().toISOString().split("T")[0],
        end_date: formData.end_date || null,
      }

      await API.post(`/opportunities/convert-to-project/${opportunityId}`, dataToSend)
      onSuccess()
      onClose()
    } catch (error) {
      console.error("Erreur de conversion:", error)
      const errorMessage = error.response?.data?.detail || error.message
      alert(`Erreur: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  if (!show) return null

  return (
    <div className="convert-modal-backdrop">
      <div className="convert-modal-container">
        <div className="convert-modal-content">
          <div className="convert-modal-header">
            <h5 className="convert-modal-title">
              <i className="fas fa-project-diagram me-2"></i>
              Convertir en projet
            </h5>
            <button type="button" className="convert-modal-close" onClick={onClose} aria-label="Fermer">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="convert-modal-body">
            <p className="convert-modal-description">
              Veuillez remplir les informations suivantes pour convertir cette opportunité en projet.
            </p>

            <form onSubmit={handleSubmit} id="convert-form">
              {/* Le champ du nom du projet est pré-rempli et en lecture seule si l'opportunité a un projet */}
              <div className="convert-form-group">
                <label htmlFor="project_name" className="convert-form-label">
                  <i className="fas fa-folder me-2"></i>
                  Nom du projet <span className="required-star">*</span>
                </label>
                <input
                  id="project_name"
                  className={`convert-form-control ${errors.project_name ? "is-invalid" : ""} ${opportunityData?.project ? "readonly-field" : ""}`}
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  placeholder="Ex: Déploiement infrastructure réseau"
                  required
                  readOnly={opportunityData?.project ? true : false}
                />
                {errors.project_name && <div className="invalid-feedback">{errors.project_name}</div>}
                {opportunityData?.project && (
                  <small className="form-text text-muted">
                    Ce champ est automatiquement rempli avec le projet de l'opportunité.
                  </small>
                )}
              </div>

              <div className="convert-form-group">
                <label htmlFor="po_client" className="convert-form-label">
                  <i className="fas fa-file-contract me-2"></i>
                  N° PO client <span className="required-star">*</span>
                </label>
                <input
                  id="po_client"
                  className={`convert-form-control ${errors.po_client ? "is-invalid" : ""}`}
                  name="po_client"
                  value={formData.po_client}
                  onChange={handleChange}
                  placeholder="Ex: PO-2025-001"
                  required
                />
                {errors.po_client && <div className="invalid-feedback">{errors.po_client}</div>}
              </div>

              <div className="convert-form-row">
                <div className="convert-form-group">
                  <label htmlFor="start_date" className="convert-form-label">
                    <i className="fas fa-calendar-alt me-2"></i>
                    Date de début
                  </label>
                  <input
                    id="start_date"
                    className="convert-form-control"
                    name="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="convert-form-group">
                  <label htmlFor="end_date" className="convert-form-label">
                    <i className="fas fa-calendar-check me-2"></i>
                    Date de fin prévue
                  </label>
                  <input
                    id="end_date"
                    className="convert-form-control"
                    name="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="convert-form-row">
                <div className="convert-form-group">
                  <label htmlFor="status" className="convert-form-label">
                    <i className="fas fa-tasks me-2"></i>
                    Statut
                  </label>
                  <select
                    id="status"
                    className="convert-form-control"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="En cours">En cours</option>
                    <option value="En attente">En attente</option>
                    <option value="Terminé">Terminé</option>
                  </select>
                </div>

                <div className="convert-form-group">
                  <label htmlFor="extra_cost" className="convert-form-label">
                    <i className="fas fa-coins me-2"></i>
                    Coûts supplémentaires
                  </label>
                  <input
                    id="extra_cost"
                    className="convert-form-control"
                    name="extra_cost"
                    type="number"
                    value={formData.extra_cost}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="convert-form-group">
                <label htmlFor="description" className="convert-form-label">
                  <i className="fas fa-align-left me-2"></i>
                  Description
                </label>
                <textarea
                  id="description"
                  className="convert-form-control"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Description détaillée du projet..."
                ></textarea>
              </div>
            </form>
          </div>

          <div className="convert-modal-footer">
            <button type="button" className="convert-btn convert-btn-secondary" onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" form="convert-form" className="convert-btn convert-btn-success" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Traitement...
                </>
              ) : (
                <>
                  <i className="fas fa-check me-2"></i>
                  Convertir
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConvertOpportunityModal
