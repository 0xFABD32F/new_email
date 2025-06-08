"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import API from "../../services/api"
import "./UserStyles.css"

function UsersList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ search: "", role: "" })
  const [currentUser, setCurrentUser] = useState(null)

  // All hooks must be called at the top level
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"))
    setCurrentUser(user)
    fetchUsers() // Fetch users immediately without checking role
  }, [])

  // Récupérer les utilisateurs depuis l'API
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await API.get("/auth/users")
      setUsers(response.data)
      setError(null)
    } catch (err) {
      console.error("Erreur:", err)
      setError("Erreur lors du chargement des utilisateurs")
    } finally {
      setLoading(false)
    }
  }

  // Supprimer un utilisateur
  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      try {
        // Correction de la route pour la suppression
        await API.delete(`/auth/${id}`)
        fetchUsers()
      } catch (err) {
        setError("Erreur lors de la suppression")
      }
    }
  }

  // Filtrer les utilisateurs
  const filteredUsers = users.filter((user) => {
    const { search, role } = filters
    const matchesSearch =
      !search ||
      Object.values(user).some(
        (val) => val && typeof val === "string" && val.toLowerCase().includes(search.toLowerCase()),
      )
    const matchesRole = !role || (user.role && user.role.toLowerCase() === role.toLowerCase())
    return matchesSearch && matchesRole
  })

  // Obtenir la classe du badge en fonction du droit d'accès
  const getBadgeClass = (access) => {
    if (!access) return "badge-info"
    const classes = {
      admin: "badge-primary",
      commercial: "badge-success",
      technique: "badge-warning",
      "lecture seule": "badge-secondary",
    }
    return classes[access.toLowerCase()] || "badge-info"
  }

  // Afficher l'état de chargement
  if (loading) {
    return (
      <div className="u-loading">
        <div className="u-spinner"></div>
        <p>Chargement des utilisateurs...</p>
      </div>
    )
  }

  // Afficher l'état d'erreur
  if (error) {
    return (
      <div className="u-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Une erreur est survenue</h3>
        <p>{error}</p>
        <button onClick={fetchUsers} className="u-btn u-btn-primary">
          <i className="fas fa-sync-alt me-2"></i>Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="u-container">
      {/* En-tête */}
      <div className="u-header">
        <div>
          <h1>
            <i className="fas fa-users me-3"></i>Gestion des Utilisateurs
          </h1>
          <p>Gérez les comptes et les droits d'accès</p>
        </div>
        <Link to="/dashboard/users/new" className="u-btn u-btn-primary">
          <i className="fas fa-plus me-2"></i>Ajouter
        </Link>
      </div>

      {/* Filtres */}
      <div className="u-filters">
        <div className="u-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Rechercher..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button onClick={() => setFilters({ ...filters, search: "" })}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          className="u-select"
        >
          <option value="">Tous les rôles</option>
          <option value="CEO">CEO</option>
          <option value="CTO">CTO</option>
          <option value="CSO">CSO</option>
          <option value="Admin">Admin</option>
        </select>

        <button className="u-btn-icon" onClick={fetchUsers} title="Rafraîchir">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      {/* Tableau */}
      <div className="u-card">
        <div className="u-table-container">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Contact</th>
                <th>Droits</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="u-bold">{user.nom || "N/A"}</td>
                    <td>{user.role || "N/A"}</td>
                    <td>
                      {user.email && (
                        <div>
                          <a href={`mailto:${user.email}`}>
                            <i className="fas fa-envelope me-2"></i>
                            {user.email}
                          </a>
                        </div>
                      )}
                      {user.phone && (
                        <div>
                          <a href={`tel:${user.phone}`}>
                            <i className="fas fa-phone me-2"></i>
                            {user.phone}
                          </a>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`u-badge ${getBadgeClass(user.droit_acces)}`}>{user.droit_acces || "N/A"}</span>
                    </td>
                    <td>
                      <div className="u-actions">
                        <Link to={`/dashboard/users/edit/${user.id}`} className="u-btn-action u-edit" title="Modifier">
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button
                          className="u-btn-action u-delete"
                          onClick={() => handleDelete(user.id)}
                          title="Supprimer"
                          disabled={user.id === currentUser?.user_id} // Prevent users from deleting themselves
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="u-empty">
                    <div>
                      <i className="fas fa-search"></i>
                      <h3>Aucun utilisateur trouvé</h3>
                      <p>Aucun utilisateur ne correspond à vos critères</p>
                      {filters.search || filters.role ? (
                        <button className="u-btn u-btn-secondary" onClick={() => setFilters({ search: "", role: "" })}>
                          Effacer les filtres
                        </button>
                      ) : (
                        <Link to="/dashboard/users/new" className="u-btn u-btn-primary">
                          <i className="fas fa-plus me-2"></i>Ajouter un utilisateur
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

      {/* Pied de page */}
      <div className="u-footer">
        <div className="u-stats">
          <span>
            Total: <strong>{users.length}</strong>
          </span>
          <span>
            Affichés: <strong>{filteredUsers.length}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}

export default UsersList
