"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import API from "../../services/api"
import ConvertOpportunityModal from "./ConvertOpportunityModal"
import "./OpportunitiesStyles.css"

function OpportunitiesList() {
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStep, setFilterStep] = useState("")

  useEffect(() => {
    fetchOpportunities()
  }, [])

  const fetchOpportunities = async () => {
    try {
      setLoading(true)
      const response = await API.get("/opportunities/")
      setOpportunities(response.data)
      setError(null)
    } catch (err) {
      console.error("Erreur de chargement :", err)
      setError("Erreur de chargement des opportunités")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!id || id === "undefined") return alert("ID invalide")

    if (window.confirm("Confirmer la suppression ?")) {
      try {
        await API.delete(`/opportunities/${id}`)
        setOpportunities((prev) => prev.filter((opp) => opp.id !== id))
      } catch (err) {
        console.error("Erreur suppression:", err)
        alert("Erreur lors de la suppression de l'opportunité.")
      }
    }
  }

  const handleConvertToProject = (opportunityId) => {
    setSelectedOpportunity(opportunityId)
    setModalVisible(true)
  }

  const handleConversionSuccess = () => {
    // Vous pouvez mettre à jour l'état local ou recharger les données
    alert("Projet créé avec succès !")
    // Optionnel: Rafraîchir la liste des opportunités
    fetchOpportunities()
  }

  const getStepBadgeClass = (step) => {
    const steps = {
      "définition besoin": "badge-secondary",
      "Demande de devis": "badge-info",
      "Réception de devis": "badge-primary",
      Clarification: "badge-warning",
      "Offre Oddnet": "badge-info",
      "PO Client": "badge-success",
      "Converti en projet": "badge-dark",
    }
    return steps[step] || "badge-info"
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR")
  }

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      !searchTerm ||
      Object.values(opp).some(
        (value) => value && typeof value === "string" && value.toLowerCase().includes(searchTerm.toLowerCase()),
      )

    const matchesStep = !filterStep || (opp.current_step && opp.current_step === filterStep)

    return matchesSearch && matchesStep
  })

  if (loading) {
    return (
      <div className="opp-loading">
        <div className="opp-spinner"></div>
        <p>Chargement des opportunités...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="opp-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Une erreur est survenue</h3>
        <p>{error}</p>
        <button onClick={fetchOpportunities} className="opp-btn opp-btn-primary">
          <i className="fas fa-sync-alt me-2"></i>Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="opp-container">
      <div className="opp-header">
        <div>
          <h1>
            <i className="fas fa-lightbulb me-3"></i>Gestion des Opportunités
          </h1>
          <p>Gérez vos opportunités commerciales et suivez leur progression</p>
        </div>
        <Link to="/dashboard/opportunities/new" className="opp-btn opp-btn-primary">
          <i className="fas fa-plus me-2"></i> Ajouter une opportunité
        </Link>
      </div>

      <div className="opp-filters">
        <div className="opp-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Rechercher une opportunité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <select value={filterStep} onChange={(e) => setFilterStep(e.target.value)} className="opp-select">
          <option value="">Toutes les étapes</option>
          <option value="définition besoin">Définition besoin</option>
          <option value="Demande de devis">Demande de devis</option>
          <option value="Réception de devis">Réception de devis</option>
          <option value="Clarification">Clarification</option>
          <option value="Offre Oddnet">Offre Oddnet</option>
          <option value="PO Client">PO Client</option>
          <option value="Converti en projet">Converti en projet</option>
        </select>

        <button className="opp-btn-icon" onClick={fetchOpportunities} title="Rafraîchir">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      <div className="opp-card">
        <div className="opp-table-container">
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
                <th>Deadline</th>
                {/* <th>N° PO</th> */}
                <th>N° Devis</th>
                <th>Montant</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.length > 0 ? (
                filteredOpportunities.map((op) => (
                  <tr key={op.id}>
                    <td className="opp-bold">{op.reference_project || "N/A"}</td>
                    <td className="opp-bold">{op.company_name || "N/A"}</td>
                    <td>
                      {op.contact_name || "N/A"}
                      {op.contact_position && <div className="opp-small">{op.contact_position}</div>}
                    </td>
                    <td>
                      {op.email && (
                        <div>
                          <a href={`mailto:${op.email}`}>{op.email}</a>
                        </div>
                      )}
                      {op.phone && (
                        <div>
                          <a href={`tel:${op.phone}`}>{op.phone}</a>
                        </div>
                      )}
                      {!op.email && !op.phone && "N/A"}
                    </td>
                    <td>{op.country || "N/A"}</td>
                    <td>{op.sector_field || "N/A"}</td>
                    <td>
                      {op.project ? (
                        <span title={op.project}>
                          {op.project.length > 20 ? op.project.substring(0, 20) + "..." : op.project}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td>
                      <span className={`opp-badge ${getStepBadgeClass(op.current_step)}`}>
                        {op.current_step || "N/A"}
                      </span>
                    </td>
                    <td>{formatDate(op.current_step_date)}</td>
                    <td>{op.client_deadline ? new Date(op.client_deadline).toLocaleString("fr-FR") : "N/A"}</td>
                    {/* <td>{op.po_number || "N/A"}</td> */}
                    <td>{op.devis_number || "N/A"}</td>
                    <td>{op.montant_devis ? `${op.montant_devis.toLocaleString()} MAD` : "N/A"}</td>
                    <td>
                      <div className="opp-actions">
                        <Link
                          to={`/dashboard/opportunities/edit/${op.id}`}
                          className="opp-btn-action opp-edit"
                          title="Modifier"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button
                          className="opp-btn-action opp-delete"
                          onClick={() => handleDelete(op.id)}
                          title="Supprimer"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                        {op.current_step === "PO Client" && (
                          <button
                            className="opp-btn-action opp-convert"
                            onClick={() => handleConvertToProject(op.id)}
                            title="Convertir en projet"
                          >
                            <i className="fas fa-project-diagram"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="14" className="opp-empty">
                    <div>
                      <i className="fas fa-search"></i>
                      <h3>Aucune opportunité trouvée</h3>
                      <p>Aucune opportunité ne correspond à vos critères ou aucune opportunité n'a été créée.</p>
                      {searchTerm || filterStep ? (
                        <button
                          className="opp-btn opp-btn-secondary"
                          onClick={() => {
                            setSearchTerm("")
                            setFilterStep("")
                          }}
                        >
                          Effacer les filtres
                        </button>
                      ) : (
                        <Link to="/dashboard/opportunities/new" className="opp-btn opp-btn-primary">
                          <i className="fas fa-plus me-2"></i> Ajouter votre première opportunité
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

      <div className="opp-footer">
        <div className="opp-stats">
          <span>
            Total: <strong>{opportunities.length}</strong>
          </span>
          <span>
            Affichés: <strong>{filteredOpportunities.length}</strong>
          </span>
        </div>
      </div>

      <ConvertOpportunityModal
        show={modalVisible}
        opportunityId={selectedOpportunity}
        onClose={() => setModalVisible(false)}
        onSuccess={handleConversionSuccess}
      />
    </div>
  )
}

export default OpportunitiesList