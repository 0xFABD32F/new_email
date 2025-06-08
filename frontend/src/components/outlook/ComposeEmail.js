"use client"

import { useState, useEffect } from "react"

function ComposeEmail({ onClose, replyTo = null }) {
  const [formData, setFormData] = useState({
    to: "",
    cc: "",
    subject: "",
    body: "",
  })
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Charger la liste des clients pour l'autocomplétion
    fetchClients()
      .then((data) => setClients(data))
      .catch((err) => console.error("Erreur lors du chargement des clients:", err))

    // Si c'est une réponse à un email
    if (replyTo) {
      setFormData({
        to: replyTo.from.emailAddress.address,
        cc: "",
        subject: `Re: ${replyTo.subject}`,
        body: `\n\n-------- Message original --------\nDe: ${replyTo.from.emailAddress.name} <${replyTo.from.emailAddress.address}>\nDate: ${new Date(replyTo.receivedDateTime).toLocaleString()}\nObjet: ${replyTo.subject}\n\n${replyTo.bodyPreview}`,
      })
    }
  }, [replyTo])

  // Fonction de simulation pour la démonstration
  const fetchClients = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 1, company: "Banque Populaire", email: "contact@bp.ma" },
          { id: 2, company: "Maroc Telecom", email: "achats@iam.ma" },
          { id: 3, company: "OCP Group", email: "info@ocpgroup.ma" },
          { id: 4, company: "Tanger Med", email: "it@tangermed.ma" },
          { id: 5, company: "Royal Air Maroc", email: "support@ram.ma" },
        ])
      }, 500)
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Simuler l'envoi d'un email via Microsoft Graph API
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)

      // Réinitialiser le formulaire après 2 secondes
      setTimeout(() => {
        if (onClose) onClose()
      }, 2000)
    }, 1500)
  }

  const handleClientSelect = (client) => {
    setFormData((prev) => ({
      ...prev,
      to: client.email,
    }))
  }

  return (
    <div className="compose-email card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Nouveau message</h5>
        <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      <div className="card-body">
        {success ? (
          <div className="alert alert-success">
            <i className="fas fa-check-circle me-2"></i>
            Message envoyé avec succès!
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="to" className="form-label">
                À:
              </label>
              <div className="input-group">
                <input
                  type="email"
                  className="form-control"
                  id="to"
                  name="to"
                  value={formData.to}
                  onChange={handleChange}
                  required
                />
                <button
                  className="btn btn-outline-secondary dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Clients
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  {clients.map((client) => (
                    <li key={client.id}>
                      <button className="dropdown-item" type="button" onClick={() => handleClientSelect(client)}>
                        {client.company} - {client.email}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="cc" className="form-label">
                Cc:
              </label>
              <input
                type="text"
                className="form-control"
                id="cc"
                name="cc"
                value={formData.cc}
                onChange={handleChange}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="subject" className="form-label">
                Objet:
              </label>
              <input
                type="text"
                className="form-control"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="body" className="form-label">
                Message:
              </label>
              <textarea
                className="form-control"
                id="body"
                name="body"
                rows="10"
                value={formData.body}
                onChange={handleChange}
                required
              ></textarea>
            </div>

            {error && (
              <div className="alert alert-danger mb-3">
                <i className="fas fa-exclamation-circle me-2"></i>
                {error}
              </div>
            )}

            <div className="d-flex justify-content-between">
              <div>
                <button type="button" className="btn btn-outline-secondary me-2">
                  <i className="fas fa-paperclip me-1"></i> Pièce jointe
                </button>
                <button type="button" className="btn btn-outline-secondary">
                  <i className="fas fa-save me-1"></i> Enregistrer
                </button>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane me-1"></i> Envoyer
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ComposeEmail