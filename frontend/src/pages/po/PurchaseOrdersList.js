"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import API from "../../services/api"
import "./PurchaseOrderStyles.css"

function PurchaseOrdersList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)
      const response = await API.get("/purchase-orders/")
      setPurchaseOrders(response.data)
      setError(null)
    } catch (err) {
      console.error("Erreur de chargement des bons de commande:", err)
      setError("Erreur lors du chargement des bons de commande")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce bon de commande ?")) {
      try {
        await API.delete(`/purchase-orders/${id}`)
        setPurchaseOrders((prev) => prev.filter((po) => po.id !== id))
      } catch (err) {
        console.error("Erreur lors de la suppression:", err)
        setError("Erreur lors de la suppression du bon de commande")
      }
    }
  }

  const handleGeneratePDF = async (id) => {
    try {

      const pdfUrl = `${API.baseURL}/purchase-orders/${id}/generate-pdf`;
      console.log("URL de téléchargement PDF:", pdfUrl);
  
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.setAttribute("download", `PO_${id}.pdf`); 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erreur lors de la génération du fichier PDF:", err);
      setError("Erreur lors de la génération du fichier PDF");
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Draft":
        return "badge-secondary"
      case "Sent":
        return "badge-primary"
      case "Confirmed":
        return "badge-success"
      case "Delivered":
        return "badge-info"
      case "Cancelled":
        return "badge-danger"
      default:
        return "badge-secondary"
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR")
  }

  const filteredPurchaseOrders = purchaseOrders.filter((po) => {
    const matchesSearch =
      !searchTerm ||
      Object.values(po).some(
        (value) => value && typeof value === "string" && value.toLowerCase().includes(searchTerm.toLowerCase()),
      )

    const matchesStatus = !filterStatus || (po.status && po.status === filterStatus)

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="po-loading">
        <div className="po-spinner"></div>
        <p>Chargement des bons de commande...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="po-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Une erreur est survenue</h3>
        <p>{error}</p>
        <button onClick={fetchPurchaseOrders} className="po-btn po-btn-primary">
          <i className="fas fa-sync-alt me-2"></i>Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="po-container">
      <div className="po-header">
        <div>
          <h1>
            <i className="fas fa-file-invoice me-3"></i>Gestion des Bons de Commande
          </h1>
          <p>Gérez vos bons de commande et suivez leur progression</p>
        </div>
        <Link to="/dashboard/purchase-orders/new" className="po-btn po-btn-primary">
          <i className="fas fa-plus me-2"></i> Créer un bon de commande
        </Link>
      </div>

      <div className="po-filters">
        <div className="po-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Rechercher un bon de commande..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="po-select">
          <option value="">Tous les statuts</option>
          <option value="Draft">Brouillon</option>
          <option value="Sent">Envoyé</option>
          <option value="Confirmed">Confirmé</option>
          <option value="Delivered">Livré</option>
          <option value="Cancelled">Annulé</option>
        </select>

        <button className="po-btn-icon" onClick={fetchPurchaseOrders} title="Rafraîchir">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      <div className="po-card">
        <div className="po-table-container">
          <table>
            <thead>
              <tr>
                <th>N° PO</th>
                <th>Fournisseur</th>
                <th>Date</th>
                <th>Devise</th>
                <th>Taux</th>
                <th>Montant Total</th>
                <th>ETA</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchaseOrders.length > 0 ? (
                filteredPurchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="po-bold">{po.po_number}</td>
                    <td>
                      {po.supplier ? po.supplier.company : "N/A"}
                      <div className="po-small">{po.supplier ? po.supplier.country : ""}</div>
                    </td>
                    <td>{formatDate(po.date_creation)}</td>
                    <td>{po.currency}</td>
                    <td>{po.rate}</td>
                    <td>
                      {po.total_amount.toLocaleString()} {po.currency}
                    </td>
                    <td>{po.eta || "N/A"}</td>
                    <td>
                      <span className={`po-badge ${getStatusBadgeClass(po.status)}`}>{po.status}</span>
                    </td>
                    <td>
                      <div className="po-actions">
                        <Link
                          to={`/dashboard/purchase-orders/edit/${po.id}`}
                          className="po-btn-action po-edit"
                          title="Modifier"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button
                          className="po-btn-action po-delete"
                          onClick={() => handleDelete(po.id)}
                          title="Supprimer"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                        <button
                          className="po-btn-action po-pdf"
                          onClick={() => handleGeneratePDF(po.id)}
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
                  <td colSpan="9" className="po-empty">
                    <div>
                      <i className="fas fa-search"></i>
                      <h3>Aucun bon de commande trouvé</h3>
                      <p>Aucun bon de commande ne correspond à vos critères ou aucun bon de commande n'a été créé.</p>
                      {searchTerm || filterStatus ? (
                        <button
                          className="po-btn po-btn-secondary"
                          onClick={() => {
                            setSearchTerm("")
                            setFilterStatus("")
                          }}
                        >
                          Effacer les filtres
                        </button>
                      ) : (
                        <Link to="/dashboard/purchase-orders/new" className="po-btn po-btn-primary">
                          <i className="fas fa-plus me-2"></i> Créer votre premier bon de commande
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

      <div className="po-footer">
        <div className="po-stats">
          <span>
            Total: <strong>{purchaseOrders.length}</strong>
          </span>
          <span>
            Affichés: <strong>{filteredPurchaseOrders.length}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}

export default PurchaseOrdersList
