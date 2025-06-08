"use client"

import { useState, useEffect } from "react"
import API from "../../services/api"
import "./ConvertLeadModal.css"

function ConvertLeadModal({ show, onClose, leadId, onSuccess }) {
  const [formData, setFormData] = useState({
    devis_number: "",
    montant_devis: "",
    client_deadline: "",
    // po_number: "",
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [leadData, setLeadData] = useState(null)

  useEffect(() => {
    // Fetch lead data when modal opens
    if (show && leadId) {
      const fetchLead = async () => {
        try {
          const response = await API.get(`/leads/${leadId}`)
          setLeadData(response.data)

          // Generate a devis number based on company name
          const companyPrefix = response.data.company_name.substring(0, 3).toUpperCase()
          const devisNumber = `DEV-${companyPrefix}-${new Date().getFullYear().toString().substring(2)}-${Math.floor(
            Math.random() * 1000,
          )
            .toString()
            .padStart(3, "0")}`

          setFormData((prev) => ({
            ...prev,
            devis_number: devisNumber,
          }))
        } catch (error) {
          console.error("Error fetching lead:", error)
        }
      }

      fetchLead()
    }
  }, [show, leadId])

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
    if (!formData.devis_number.trim()) {
      newErrors.devis_number = "Le numéro de devis est requis"
    }

    if (!formData.montant_devis || Number.parseFloat(formData.montant_devis) <= 0) {
      newErrors.montant_devis = "Veuillez saisir un montant valide"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    try {
      await API.post(`/leads/convert/${leadId}`, {
        ...formData,
        montant_devis: Number.parseFloat(formData.montant_devis),
      })
      onSuccess()
      onClose()
    } catch (error) {
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
              <i className="fas fa-exchange-alt me-2"></i>
              Convertir en opportunité
            </h5>
            <button type="button" className="convert-modal-close" onClick={onClose} aria-label="Fermer">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="convert-modal-body">
            {leadData && (
              <div className="convert-modal-lead-info">
                <p>
                  <strong>Client:</strong> {leadData.company_name}
                </p>
                <p>
                  <strong>Contact:</strong> {leadData.contact_name}
                </p>
                <p>
                  <strong>Projet:</strong> {leadData.project}
                </p>
              </div>
            )}

            <p className="convert-modal-description">
              Veuillez remplir les informations suivantes pour convertir ce lead en opportunité.
            </p>

            <form onSubmit={handleSubmit} id="convert-form">
              <div className="convert-form-group">
                <label htmlFor="devis_number" className="convert-form-label">
                  <i className="fas fa-file-invoice me-2"></i>
                  Numéro devis <span className="required-star">*</span>
                </label>
                <input
                  id="devis_number"
                  className={`convert-form-control ${errors.devis_number ? "is-invalid" : ""}`}
                  name="devis_number"
                  value={formData.devis_number}
                  onChange={handleChange}
                  placeholder="Ex: DEV-2023-001"
                  required
                />
                {errors.devis_number && <div className="invalid-feedback">{errors.devis_number}</div>}
              </div>

              <div className="convert-form-group">
                <label htmlFor="montant_devis" className="convert-form-label">
                  <i className="fas fa-money-bill-wave me-2"></i>
                  Montant (MAD) <span className="required-star">*</span>
                </label>
                <div className="convert-input-group">
                  <input
                    id="montant_devis"
                    className={`convert-form-control ${errors.montant_devis ? "is-invalid" : ""}`}
                    name="montant_devis"
                    type="number"
                    value={formData.montant_devis}
                    onChange={handleChange}
                    placeholder="Ex: 10000"
                    required
                  />
                  <span className="convert-input-group-text">MAD</span>
                </div>
                {errors.montant_devis && <div className="invalid-feedback">{errors.montant_devis}</div>}
              </div>

              <div className="convert-form-row">
                <div className="convert-form-group">
                  <label htmlFor="client_deadline" className="convert-form-label">
                    <i className="fas fa-calendar-alt me-2"></i>
                    Deadline client
                  </label>
                  <input
                    id="client_deadline"
                    className="convert-form-control"
                    name="client_deadline"
                    type="date"
                    value={formData.client_deadline}
                    onChange={handleChange}
                  />
                </div>

                {/* <div className="convert-form-group">
                  <label htmlFor="po_number" className="convert-form-label">
                    <i className="fas fa-hashtag me-2"></i>
                    Numéro PO
                  </label>
                  <input
                    id="po_number"
                    className="convert-form-control"
                    name="po_number"
                    value={formData.po_number}
                    onChange={handleChange}
                    placeholder="Ex: PO-2023-001"
                  />
                </div> */}
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

export default ConvertLeadModal
