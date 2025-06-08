"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import API from "../../services/api"
import "./ClientsStyles.css"

function ClientsList() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSector, setFilterSector] = useState("")

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const response = await API.get("/clients")
      setClients(response.data)
      setError(null)
    } catch (err) {
      console.error("Erreur de chargement des clients:", err)
      setError("Erreur lors du chargement des clients")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
      try {
        await API.delete(`/clients/${id}`)
        setClients((prev) => prev.filter((client) => client.id !== id))
      } catch (err) {
        console.error("Erreur lors de la suppression:", err)
        setError("Erreur lors de la suppression du client")
      }
    }
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      !searchTerm ||
      Object.values(client).some(
        (value) => value && typeof value === "string" && value.toLowerCase().includes(searchTerm.toLowerCase()),
      )

    const matchesSector = !filterSector || (client.sector_field && client.sector_field === filterSector)

    return matchesSearch && matchesSector
  })

  // Obtenir les secteurs uniques pour le filtre
  const uniqueSectors = [...new Set(clients.map((client) => client.sector_field).filter(Boolean))]

  if (loading) {
    return (
      <div className="clients-loading">
        <div className="clients-spinner"></div>
        <p>Chargement des clients...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="clients-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Une erreur est survenue</h3>
        <p>{error}</p>
        <button onClick={fetchClients} className="clients-btn clients-btn-primary">
          <i className="fas fa-sync-alt me-2"></i>Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="clients-container">
      <div className="clients-header">
        <div>
          <h1>
            <i className="fas fa-building me-3"></i>Gestion des Clients
          </h1>
          <p>Gérez vos clients et leurs informations</p>
        </div>
        <Link to="/dashboard/clients/new" className="clients-btn clients-btn-primary">
          <i className="fas fa-plus me-2"></i> Ajouter un client
        </Link>
      </div>

      <div className="clients-filters">
        <div className="clients-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <select value={filterSector} onChange={(e) => setFilterSector(e.target.value)} className="clients-select">
          <option value="">Tous les secteurs</option>
          {uniqueSectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>

        <button className="clients-btn-icon" onClick={fetchClients} title="Rafraîchir">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      <div className="clients-card">
        <div className="clients-table-container">
          <table>
            <thead>
              <tr>
                <th>Société</th>
                <th>Contact/position</th>
                <th>Email/Tél</th>
                <th>Pays</th>
                <th>Secteur</th>
                <th>Adresse</th>
                <th>Conditions Paiement</th>
                <th>Conditions Facture</th>
                <th>Devise</th>
                <th>Zone Franche</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td className="clients-bold">{client.company_name || "N/A"}</td>
                    <td>
                      {client.contact_name || "N/A"}
                      {client.contact_position && <div className="clients-small">{client.contact_position}</div>}
                    </td>
                    <td>
                      {client.email && (
                        <div>
                          <a href={`mailto:${client.email}`}>{client.email}</a>
                        </div>
                      )}
                      {client.phone && (
                        <div>
                          <a href={`tel:${client.phone}`}>{client.phone}</a>
                        </div>
                      )}
                      {!client.email && !client.phone && "N/A"}
                    </td>
                    <td>{client.country || "N/A"}</td>
                    <td>{client.sector_field || "N/A"}</td>
                    <td>{client.address || "N/A"}</td>
                    <td>{client.payment_terms || "N/A"}</td>
                    <td>{client.invoice_terms || "N/A"}</td>
                    <td>{client.currency || "MAD"}</td>
                    <td>
                      <span
                        className={`clients-badge ${
                          client.is_zone_franche === "OUI" ? "badge-success" : "badge-secondary"
                        }`}
                      >
                        {client.is_zone_franche || "NON"}
                      </span>
                    </td>
                    <td>
                      <div className="clients-actions">
                        <Link
                          to={`/dashboard/clients/edit/${client.id}`}
                          className="clients-btn-action clients-edit"
                          title="Modifier"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button
                          className="clients-btn-action clients-delete"
                          onClick={() => handleDelete(client.id)}
                          title="Supprimer"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="clients-empty">
                    <div>
                      <i className="fas fa-search"></i>
                      <h3>Aucun client trouvé</h3>
                      <p>Aucun client ne correspond à vos critères ou aucun client n'a été créé.</p>
                      {searchTerm || filterSector ? (
                        <button
                          className="clients-btn clients-btn-secondary"
                          onClick={() => {
                            setSearchTerm("")
                            setFilterSector("")
                          }}
                        >
                          Effacer les filtres
                        </button>
                      ) : (
                        <Link to="/dashboard/clients/new" className="clients-btn clients-btn-primary">
                          <i className="fas fa-plus me-2"></i> Ajouter votre premier client
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

      <div className="clients-footer">
        <div className="clients-stats">
          <span>
            Total: <strong>{clients.length}</strong>
          </span>
          <span>
            Affichés: <strong>{filteredClients.length}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}

export default ClientsList
