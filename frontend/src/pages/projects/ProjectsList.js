"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import API from "../../services/api"
import "./ProjectsStyles.css"

function ProjectsList() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await API.get("/projects/")
      setProjects(response.data)
      setError(null)
    } catch (err) {
      console.error("Erreur de chargement :", err)
      setError("Erreur de chargement des projets")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!id || id === "undefined") return alert("ID invalide")

    if (window.confirm("Confirmer la suppression ?")) {
      try {
        await API.delete(`/projects/${id}`)
        setProjects((prev) => prev.filter((project) => project.id !== id))
      } catch (err) {
        console.error("Erreur suppression:", err)
        alert("Erreur lors de la suppression du projet.")
      }
    }
  }

  const getStatusBadgeClass = (status) => {
    const statuses = {
      "En cours": "badge-primary",
      "En attente": "badge-warning",
      "Terminé": "badge-success",
    }
    return statuses[status] || "badge-info"
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR")
  }

  const formatMoney = (amount) => {
    if (!amount && amount !== 0) return "N/A"
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(amount)
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      !searchTerm ||
      Object.values(project).some(
        (value) => value && typeof value === "string" && value.toLowerCase().includes(searchTerm.toLowerCase()),
      )

    const matchesStatus = !filterStatus || (project.status && project.status === filterStatus)

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="projects-loading">
        <div className="projects-spinner"></div>
        <p>Chargement des projets...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="projects-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Une erreur est survenue</h3>
        <p>{error}</p>
        <button onClick={fetchProjects} className="projects-btn projects-btn-primary">
          <i className="fas fa-sync-alt me-2"></i>Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <div>
          <h1>
            <i className="fas fa-project-diagram me-3"></i>Gestion des Projets
          </h1>
          <p>Gérez vos projets et suivez leur progression</p>
        </div>
        <Link to="/dashboard/projects/new" className="projects-btn projects-btn-primary">
          <i className="fas fa-plus me-2"></i> Ajouter un projet
        </Link>
      </div>

      <div className="projects-filters">
        <div className="projects-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Rechercher un projet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="projects-select">
          <option value="">Tous les statuts</option>
          <option value="En cours">En cours</option>
          <option value="En attente">En attente</option>
          <option value="Terminé">Terminé</option>
        </select>

        <button className="projects-btn-icon" onClick={fetchProjects} title="Rafraîchir">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      <div className="projects-card">
        <div className="projects-table-container">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Projet</th>
                <th>PO Client</th>
                <th>Montant PO</th>
                <th>Devis Final</th>
                <th>Montant Devis</th>
                <th>Extra Coûts</th>
                <th>Statut</th>
                <th>Date début</th>
                <th>Date fin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td className="projects-bold">{project.client || "N/A"}</td>
                    <td className="projects-bold">{project.project_name || "N/A"}</td>
                    <td>{project.po_client || "N/A"}</td>
                    <td>{formatMoney(project.montant_po)}</td>
                    <td>{project.devis_oddnet_final || "N/A"}</td>
                    <td>{formatMoney(project.montant_devis_final)}</td>
                    <td>{formatMoney(project.extra_cost)}</td>
                    <td>
                      <span className={`projects-badge ${getStatusBadgeClass(project.status)}`}>
                        {project.status || "N/A"}
                      </span>
                    </td>
                    <td>{formatDate(project.start_date)}</td>
                    <td>{formatDate(project.end_date)}</td>
                    <td>
                      <div className="projects-actions">
                        <Link
                          to={`/dashboard/projects/edit/${project.id}`}
                          className="projects-btn-action projects-edit"
                          title="Modifier"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button
                          className="projects-btn-action projects-delete"
                          onClick={() => handleDelete(project.id)}
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
                  <td colSpan="11" className="projects-empty">
                    <div>
                      <i className="fas fa-search"></i>
                      <h3>Aucun projet trouvé</h3>
                      <p>Aucun projet ne correspond à vos critères ou aucun projet n'a été créé.</p>
                      {searchTerm || filterStatus ? (
                        <button
                          className="projects-btn projects-btn-secondary"
                          onClick={() => {
                            setSearchTerm("")
                            setFilterStatus("")
                          }}
                        >
                          Effacer les filtres
                        </button>
                      ) : (
                        <Link to="/dashboard/projects/new" className="projects-btn projects-btn-primary">
                          <i className="fas fa-plus me-2"></i> Ajouter votre premier projet
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

      <div className="projects-footer">
        <div className="projects-stats">
          <span>
            Total: <strong>{projects.length}</strong>
          </span>
          <span>
            Affichés: <strong>{filteredProjects.length}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}

export default ProjectsList