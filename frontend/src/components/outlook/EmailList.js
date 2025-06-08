"use client"

import { useState, useEffect } from "react"

function EmailList() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedEmail, setSelectedEmail] = useState(null)

  useEffect(() => {
    // Vérifier si l'utilisateur est authentifié
    const token = localStorage.getItem("outlook_token")
    if (!token) {
      setError("Vous devez vous connecter à Outlook pour voir vos emails")
      setLoading(false)
      return
    }

    // Simuler le chargement des emails depuis l'API Microsoft Graph
    fetchEmails()
      .then((data) => {
        setEmails(data)
        setLoading(false)
      })
      .catch((err) => {
        setError("Erreur lors du chargement des emails: " + err.message)
        setLoading(false)
      })
  }, [])

  // Fonction de simulation pour la démonstration
  const fetchEmails = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: "1",
            subject: "Proposition commerciale",
            from: { emailAddress: { name: "Banque Populaire", address: "contact@bp.ma" } },
            receivedDateTime: "2023-11-15T10:30:00Z",
            bodyPreview: "Bonjour, suite à notre discussion concernant le projet de sécurisation...",
            isRead: true,
          },
          {
            id: "2",
            subject: "Demande de devis pour équipements réseau",
            from: { emailAddress: { name: "Maroc Telecom", address: "achats@iam.ma" } },
            receivedDateTime: "2023-11-14T14:45:00Z",
            bodyPreview: "Nous souhaitons recevoir un devis pour les équipements suivants...",
            isRead: false,
          },
          {
            id: "3",
            subject: "Suivi de commande #REF-2023-005",
            from: { emailAddress: { name: "OCP Group", address: "logistique@ocpgroup.ma" } },
            receivedDateTime: "2023-11-13T09:15:00Z",
            bodyPreview: "Pouvez-vous nous confirmer la date de livraison pour notre commande...",
            isRead: true,
          },
          {
            id: "4",
            subject: "Invitation: Réunion technique",
            from: { emailAddress: { name: "Tanger Med", address: "it@tangermed.ma" } },
            receivedDateTime: "2023-11-12T16:20:00Z",
            bodyPreview: "Nous vous invitons à une réunion technique concernant le déploiement...",
            isRead: false,
          },
          {
            id: "5",
            subject: "Confirmation de rendez-vous",
            from: { emailAddress: { name: "Royal Air Maroc", address: "support@ram.ma" } },
            receivedDateTime: "2023-11-11T11:05:00Z",
            bodyPreview: "Ce message confirme notre rendez-vous du 20 novembre à 14h00...",
            isRead: true,
          },
        ])
      }, 1000)
    })
  }

  const formatDate = (dateString) => {
    const options = { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
    return new Date(dateString).toLocaleDateString("fr-FR", options)
  }

  const handleEmailClick = (email) => {
    setSelectedEmail(email)

    // Marquer l'email comme lu
    if (!email.isRead) {
      const updatedEmails = emails.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
      setEmails(updatedEmails)
    }
  }

  const closeEmailDetail = () => {
    setSelectedEmail(null)
  }

  if (loading) {
    return <div className="p-4">Chargement des emails...</div>
  }

  if (error) {
    return <div className="p-4 text-danger">{error}</div>
  }

  return (
    <div className="email-container">
      {selectedEmail ? (
        <div className="email-detail card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">{selectedEmail.subject}</h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={closeEmailDetail}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="card-body">
            <div className="email-header mb-3">
              <div>
                <strong>De:</strong> {selectedEmail.from.emailAddress.name} &lt;
                {selectedEmail.from.emailAddress.address}&gt;
              </div>
              <div>
                <strong>Date:</strong> {formatDate(selectedEmail.receivedDateTime)}
              </div>
            </div>
            <div className="email-body">
              {selectedEmail.bodyPreview}
              <p className="mt-3 font-italic text-muted">
                Ceci est une simulation. Dans une implémentation réelle, le contenu complet de l'email serait affiché
                ici.
              </p>
            </div>
            <div className="email-actions mt-3">
              <button className="btn btn-primary me-2">
                <i className="fas fa-reply me-1"></i> Répondre
              </button>
              <button className="btn btn-outline-primary me-2">
                <i className="fas fa-reply-all me-1"></i> Répondre à tous
              </button>
              <button className="btn btn-outline-primary">
                <i className="fas fa-share me-1"></i> Transférer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="email-list">
          {emails.length === 0 ? (
            <div className="text-center p-4">Aucun email trouvé</div>
          ) : (
            <div className="list-group">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className={`list-group-item list-group-item-action ${!email.isRead ? "fw-bold" : ""}`}
                  onClick={() => handleEmailClick(email)}
                >
                  <div className="d-flex w-100 justify-content-between">
                    <h6 className="mb-1">{email.from.emailAddress.name}</h6>
                    <small>{formatDate(email.receivedDateTime)}</small>
                  </div>
                  <p className="mb-1">{email.subject}</p>
                  <small className="text-muted">{email.bodyPreview.substring(0, 100)}...</small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default EmailList