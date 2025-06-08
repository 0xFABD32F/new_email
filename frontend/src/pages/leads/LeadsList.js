"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import API from "../../services/api"
import ConvertLeadModal from "./ConvertLeadModal"
import "./LeadsStyles.css"

function LeadsList() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const response = await API.get("/leads/")
      setLeads(response.data)
      setError(null)
    } catch (err) {
      console.error("Erreur de chargement des leads:", err)
      setError("Erreur lors du chargement des leads")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce lead ?")) {
      try {
        await API.delete(`/leads/${id}`)
        fetchLeads()
      } catch (err) {
        console.error("Erreur lors de la suppression:", err)
        setError("Erreur lors de la suppression du lead")
      }
    }
  }

  const getBadgeClass = (type, value) => {
    if (!value) return "badge-info"

    const types = {
      step: {
        "first call": "badge-info",
        "first meeting": "badge-primary",
        "reunion expert it": "badge-warning",
        "envoie draft": "badge-success",
        "reception draft": "badge-secondary",
        "demande devis": "badge-danger",
      },
      status: {
        nouveau: "badge-info",
        "en cours": "badge-primary",
        terminé: "badge-success",
        perdu: "badge-danger",
      },
    }

    return types[type][value.toLowerCase()] || "badge-info"
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("fr-FR")
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchTerm ||
      Object.values(lead).some(
        (value) => value && typeof value === "string" && value.toLowerCase().includes(searchTerm.toLowerCase()),
      )

    const matchesStatus = !filterStatus || (lead.status && lead.status.toLowerCase() === filterStatus.toLowerCase())

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="leads-loading">
        <div className="leads-spinner"></div>
        <p>Chargement des leads...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="leads-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Une erreur est survenue</h3>
        <p>{error}</p>
        <button onClick={fetchLeads}>
          <i className="fas fa-sync-alt me-2"></i>Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="leads-container">
      <div className="leads-header">
        <div>
          <h1>
            <i className="fas fa-user-tie me-3"></i>Gestion des Leads
          </h1>
          <p>Gérez vos prospects et opportunités commerciales</p>
        </div>
        <Link to="/dashboard/leads/new" className="leads-btn leads-btn-primary">
          <i className="fas fa-plus me-2"></i> Ajouter un lead
        </Link>
      </div>

      <div className="leads-filters">
        <div className="leads-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Rechercher un lead..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="leads-select">
          <option value="">Tous les statuts</option>
          <option value="Nouveau">Nouveau</option>
          <option value="En cours">En cours</option>
          <option value="Terminé">Terminé</option>
          <option value="Perdu">Perdu</option>
        </select>

        <button className="leads-btn-icon" onClick={fetchLeads} title="Rafraîchir">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      <div className="leads-card">
        <div className="leads-table-container">
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Société</th>
                <th>Contact</th>
                <th>Email/Tél</th>
                <th>Pays</th>
                <th>Secteur</th>
                <th>Projet</th>
                <th>Étape</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="leads-bold">{lead.reference_project || "N/A"}</td>
                    <td className="leads-bold">{lead.company_name || "N/A"}</td>
                    <td>
                      {lead.contact_name || "N/A"}
                      {lead.contact_position && <div className="leads-small">{lead.contact_position}</div>}
                    </td>
                    <td>
                      {lead.email && <a href={`mailto:${lead.email}`}>{lead.email}</a>}
                      {lead.phone && (
                        <div>
                          <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                        </div>
                      )}
                      {!lead.email && !lead.phone && "N/A"}
                    </td>
                    <td>{lead.country || "N/A"}</td>
                    <td>{lead.sector_field || "N/A"}</td>
                    <td>
                      {lead.project ? (
                        <span title={lead.project}>
                          {lead.project.length > 20 ? lead.project.substring(0, 20) + "..." : lead.project}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td>
                      <span className={`leads-badge ${getBadgeClass("step", lead.current_step)}`}>
                        {lead.current_step || "Nouveau"}
                      </span>
                    </td>
                    <td>{formatDate(lead.current_step_date)}</td>
                    <td>
                      <span className={`leads-badge ${getBadgeClass("status", lead.status)}`}>{lead.status}</span>
                    </td>
                    <td>
                      <div className="leads-actions">
                        <Link
                          to={`/dashboard/leads/edit/${lead.id}`}
                          className="leads-btn-action leads-edit"
                          title="Modifier"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button
                          className="leads-btn-action leads-delete"
                          onClick={() => handleDelete(lead.id)}
                          title="Supprimer"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                        {lead.current_step?.toLowerCase() === "demande devis" && (
                          <button
                            className="leads-btn-action leads-convert"
                            onClick={() => {
                              setSelectedLead(lead.id)
                              setModalVisible(true)
                            }}
                            title="Convertir en opportunité"
                          >
                            <i className="fas fa-exchange-alt"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="leads-empty">
                    <div>
                      <i className="fas fa-search"></i>
                      <h3>Aucun lead trouvé</h3>
                      <p>Aucun lead ne correspond à vos critères ou aucun lead n'a été créé.</p>
                      {searchTerm || filterStatus ? (
                        <button
                          className="leads-btn leads-btn-secondary"
                          onClick={() => {
                            setSearchTerm("")
                            setFilterStatus("")
                          }}
                        >
                          Effacer les filtres
                        </button>
                      ) : (
                        <Link to="/dashboard/leads/new" className="leads-btn leads-btn-primary">
                          <i className="fas fa-plus me-2"></i> Ajouter votre premier lead
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="leads-footer">
        <div className="leads-stats">
          <span>
            Total: <strong>{leads.length}</strong>
          </span>
          <span>
            Affichés: <strong>{filteredLeads.length}</strong>
          </span>
        </div>
      </div>

      <ConvertLeadModal
        show={modalVisible}
        leadId={selectedLead}
        onClose={() => setModalVisible(false)}
        onSuccess={fetchLeads}
      />
    </div>
  )
}

export default LeadsList
