"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import API from "../../services/api"
import "./DevisStyles.css"
// Importez directement le générateur de PDF
import { generatePDF } from "../../components/DevisGenerator"

function DevisList() {
  const [devis, setDevis] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterClient, setFilterClient] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  // Update the fetchData function in DevisList.js
  const fetchData = async () => {
    try {
      setLoading(true)

      // Charger les devis
      const devisResponse = await API.get("/devis/")
      setDevis(devisResponse.data)

      // Charger les clients pour le filtre
      const clientsResponse = await API.get("/clients/")
      setClients(clientsResponse.data)

      setError(null)
    } catch (err) {
      console.error("Erreur de chargement:", err)

      // More specific error message based on the error type
      if (err.response) {
        setError(`Erreur du serveur: ${err.response.status} - ${err.response.data.detail || "Erreur inconnue"}`)
      } else if (err.request) {
        setError("Impossible de communiquer avec le serveur. Vérifiez que le backend est en cours d'exécution.")
      } else {
        setError(`Erreur: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce devis ?")) {
      try {
        await API.delete(`/devis/${id}`)
        setDevis((prev) => prev.filter((d) => d.id !== id))
      } catch (err) {
        console.error("Erreur lors de la suppression:", err)
        setError("Erreur lors de la suppression du devis")
      }
    }
  }

  const handleGeneratePDF = async (id) => {
    try {
      // Récupérer les données du devis
      const response = await API.get(`/devis/${id}`)
      const devisData = response.data

      // Appeler directement la fonction de génération de PDF
      generatePDF(devisData)
    } catch (err) {
      console.error("Erreur lors de la génération du PDF:", err)
      setError("Une erreur est survenue lors de la génération du PDF")
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Nouveau":
        return "badge-info"
      case "Envoyé":
        return "badge-primary"
      case "Accepté":
        return "badge-success"
      case "Refusé":
        return "badge-danger"
      case "En attente":
        return "badge-warning"
      default:
        return "badge-secondary"
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("fr-FR")
  }

  const filteredDevis = devis.filter((d) => {
    const matchesSearch =
      !searchTerm ||
      d.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.project?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesClient = !filterClient || d.company_name === filterClient
    const matchesStatus = !filterStatus || d.status === filterStatus

    return matchesSearch && matchesClient && matchesStatus
  })

  if (loading) {
    return (
      <div className="devis-loading">
        <div className="devis-spinner"></div>
        <p>Chargement des devis...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="devis-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Une erreur est survenue</h3>
        <p>{error}</p>
        <button onClick={fetchData} className="devis-btn devis-btn-primary">
          <i className="fas fa-sync-alt me-2"></i>Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="devis-container">
      <div className="devis-header">
        <div>
          <h1>
            <i className="fas fa-file-invoice-dollar me-3"></i>Devis
          </h1>
          <p>Gérez vos devis et suivez leur statut</p>
        </div>
        <div className="devis-header-actions">
          <Link to="/dashboard/devis/import" className="devis-btn devis-btn-outline">
            <i className="fas fa-file-import me-2"></i> Importer un devis
          </Link>
          <Link to="/dashboard/devis/new" className="devis-btn devis-btn-primary">
            <i className="fas fa-plus me-2"></i> Créer un devis
          </Link>
        </div>
      </div>

      <div className="devis-filters">
        <div className="devis-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Rechercher un devis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="devis-select">
          <option value="">Tous les clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.company_name}>
              {client.company_name}
            </option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="devis-select">
          <option value="">Tous les statuts</option>
          <option value="Nouveau">Nouveau</option>
          <option value="Envoyé">Envoyé</option>
          <option value="Accepté">Accepté</option>
          <option value="Refusé">Refusé</option>
          <option value="En attente">En attente</option>
        </select>

        <button className="devis-btn-icon" onClick={fetchData} title="Rafraîchir">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      <div className="devis-card">
        <div className="devis-table-container">
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Client</th>
                <th>Projet</th>
                <th>Date</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevis.length > 0 ? (
                filteredDevis.map((d) => (
                  <tr key={d.id}>
                    <td className="devis-bold">{d.reference}</td>
                    <td>{d.company_name}</td>
                    <td>
                      <div className="devis-description" title={d.project}>
                        {d.project}
                      </div>
                    </td>
                    <td>{formatDate(d.date_creation)}</td>
                    <td className="devis-bold">
                      {Number.parseFloat(d.total_amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                      {d.currency || "MAD"}
                    </td>
                    <td>
                      <span className={`devis-badge ${getStatusBadgeClass(d.status)}`}>{d.status}</span>
                    </td>
                    <td>
                      <div className="devis-actions">
                        <Link
                          to={`/dashboard/devis/edit/${d.id}`}
                          className="devis-btn-action devis-edit"
                          title="Modifier"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button
                          className="devis-btn-action devis-delete"
                          onClick={() => handleDelete(d.id)}
                          title="Supprimer"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                        <button
                          className="devis-btn-action devis-excel"
                          onClick={() => handleGeneratePDF(d.id)}
                          title="Générer PDF"
                        >
                          <i className="fas fa-file-pdf"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="devis-empty">
                    <div>
                      <i className="fas fa-file-invoice-dollar"></i>
                      <h3>Aucun devis trouvé</h3>
                      <p>Aucun devis ne correspond à vos critères ou aucun devis n'a été créé.</p>
                      {searchTerm || filterClient || filterStatus ? (
                        <button
                          className="devis-btn devis-btn-secondary"
                          onClick={() => {
                            setSearchTerm("")
                            setFilterClient("")
                            setFilterStatus("")
                          }}
                        >
                          Effacer les filtres
                        </button>
                      ) : (
                        <div className="empty-actions">
                          <Link to="/dashboard/devis/new" className="devis-btn devis-btn-primary">
                            <i className="fas fa-plus me-2"></i> Créer votre premier devis
                          </Link>
                          <Link to="/dashboard/devis/import" className="devis-btn devis-btn-outline">
                            <i className="fas fa-file-import me-2"></i> Ou importer un devis
                          </Link>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="devis-footer">
        <div className="devis-stats">
          <span>
            Total: <strong>{devis.length}</strong>
          </span>
          <span>
            Affichés: <strong>{filteredDevis.length}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}

export default DevisList
