"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../../services/api"
import "./PurchaseOrderStyles.css"
import "./GenerateExcelPage.css"

function GenerateExcelPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [purchaseOrder, setPurchaseOrder] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [downloadStarted, setDownloadStarted] = useState(false)

  useEffect(() => {
    // Ajouter des logs pour déboguer
    console.log("ID du bon de commande:", id)
    console.log("URL complète:", window.location.href)

    // Vérifier si l'ID est défini
    if (!id) {
      setError("ID du bon de commande non spécifié")
      setLoading(false)
      return
    }

    // Charger les données du bon de commande
    const fetchPurchaseOrder = async () => {
      try {
        setLoading(true)
        const response = await API.get(`/purchase-orders/${id}`)
        setPurchaseOrder(response.data)
        setError(null)
      } catch (err) {
        console.error("Erreur lors du chargement du bon de commande:", err)
        setError("Impossible de charger les données du bon de commande")
      } finally {
        setLoading(false)
      }
    }

    fetchPurchaseOrder()
  }, [id])

  const handleGeneratePDF = async () => {
    try {
      setGenerating(true)
      // S'assurer que l'URL est correcte et complète
      const pdfUrl = `${API.baseURL}/purchase-orders/${id}/generate-pdf`
      console.log("URL de génération PDF:", pdfUrl)
      window.open(pdfUrl, "_blank")
      setDownloadStarted(true)
      setGenerating(false)
    } catch (err) {
      console.error("Erreur lors de la génération du fichier PDF:", err)
      setError("Une erreur est survenue lors de la génération du fichier PDF")
      setGenerating(false)
    }
  }

  // Télécharger automatiquement le fichier PDF dès que la page est chargée
  useEffect(() => {
    if (!loading && purchaseOrder && !downloadStarted && id) {
      console.log("Démarrage du téléchargement automatique pour l'ID:", id)
      handleGeneratePDF()
    }
  }, [loading, purchaseOrder, downloadStarted, id])

  if (loading) {
    return (
      <div className="po-loading">
        <div className="po-spinner"></div>
        <p>Préparation du fichier PDF...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="po-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Une erreur est survenue</h3>
        <p>{error}</p>
        <button onClick={() => navigate("/dashboard/purchase-orders")} className="po-btn po-btn-primary">
          <i className="fas fa-arrow-left me-2"></i>Retour aux bons de commande
        </button>
      </div>
    )
  }

  return (
    <div className="po-container">
      <div className="po-header">
        <div>
          <h1>
            <i className="fas fa-file-pdf me-3"></i>Génération du fichier PDF
          </h1>
          <p>Bon de commande: {purchaseOrder?.po_number}</p>
        </div>
        <div className="po-header-actions">
          <button className="po-btn po-btn-secondary" onClick={() => navigate("/dashboard/purchase-orders")}>
            <i className="fas fa-arrow-left me-2"></i>
            Retour
          </button>
          <button className="po-btn po-btn-primary" onClick={handleGeneratePDF} disabled={generating}>
            {generating ? (
              <>
                <div className="po-spinner-sm"></div>
                Génération...
              </>
            ) : (
              <>
                <i className="fas fa-download me-2"></i>
                Télécharger à nouveau
              </>
            )}
          </button>
          <button className="po-btn po-btn-print" onClick={() => window.print()}>
            <i className="fas fa-print me-2"></i>
            Imprimer
          </button>
        </div>
      </div>

      <div className="po-card">
        <div className="po-form">
          <div className="po-success-message">
            <i className={`fas fa-check-circle ${downloadStarted ? "download-animation" : ""}`}></i>
            <p>
              Le fichier PDF a été généré avec succès. Si le téléchargement n'a pas démarré automatiquement, cliquez sur
              le bouton "Télécharger à nouveau".
            </p>
          </div>

          {purchaseOrder && (
            <div className="po-details mt-4">
              <h3>Détails du bon de commande</h3>
              <div className="po-details-grid">
                <div className="po-details-item">
                  <span className="po-details-label">Numéro de PO:</span>
                  <span className="po-details-value">{purchaseOrder.po_number}</span>
                </div>
                <div className="po-details-item">
                  <span className="po-details-label">Date de création:</span>
                  <span className="po-details-value">
                    {new Date(purchaseOrder.date_creation).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div className="po-details-item">
                  <span className="po-details-label">Fournisseur:</span>
                  <span className="po-details-value">{purchaseOrder.supplier?.company || "N/A"}</span>
                </div>
                <div className="po-details-item">
                  <span className="po-details-label">Montant total:</span>
                  <span className="po-details-value">
                    {purchaseOrder.total_amount.toLocaleString()} {purchaseOrder.currency}
                  </span>
                </div>
                <div className="po-details-item">
                  <span className="po-details-label">Statut:</span>
                  <span className="po-details-value">
                    <span className={`po-badge ${getStatusBadgeClass(purchaseOrder.status)}`}>
                      {purchaseOrder.status}
                    </span>
                  </span>
                </div>
                <div className="po-details-item">
                  <span className="po-details-label">ETA:</span>
                  <span className="po-details-value">{purchaseOrder.eta || "N/A"}</span>
                </div>
              </div>

              {/* Tableau des articles */}
              <h3 className="mt-4">Articles</h3>
              <div className="po-items-table">
                <table>
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Référence</th>
                      <th>Quantité</th>
                      <th>Prix unitaire</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrder.items && purchaseOrder.items.length > 0 ? (
                      purchaseOrder.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_id}</td>
                          <td>{item.product_reference || "N/A"}</td>
                          <td>{item.qty}</td>
                          <td>
                            {item.unit_cost.toLocaleString()} {purchaseOrder.currency}
                          </td>
                          <td>
                            {item.total_price.toLocaleString()} {purchaseOrder.currency}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">
                          Aucun article trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4" className="text-right">
                        <strong>Sous-total:</strong>
                      </td>
                      <td>
                        <strong>
                          {purchaseOrder.items
                            ? purchaseOrder.items.reduce((sum, item) => sum + item.total_price, 0).toLocaleString()
                            : 0}{" "}
                          {purchaseOrder.currency}
                        </strong>
                      </td>
                    </tr>
                    {purchaseOrder.shipping_cost > 0 && (
                      <tr>
                        <td colSpan="4" className="text-right">
                          Frais de livraison:
                        </td>
                        <td>
                          {purchaseOrder.shipping_cost.toLocaleString()} {purchaseOrder.currency}
                        </td>
                      </tr>
                    )}
                    {purchaseOrder.discount > 0 && (
                      <tr>
                        <td colSpan="4" className="text-right">
                          Remise ({purchaseOrder.discount}%):
                        </td>
                        <td>
                          -{calculateDiscount(purchaseOrder).toLocaleString()} {purchaseOrder.currency}
                        </td>
                      </tr>
                    )}
                    {purchaseOrder.tva > 0 && (
                      <tr>
                        <td colSpan="4" className="text-right">
                          TVA ({purchaseOrder.tva}%):
                        </td>
                        <td>
                          {calculateTVA(purchaseOrder).toLocaleString()} {purchaseOrder.currency}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan="4" className="text-right">
                        <strong>Total:</strong>
                      </td>
                      <td>
                        <strong>
                          {purchaseOrder.total_amount.toLocaleString()} {purchaseOrder.currency}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Fonction utilitaire pour déterminer la classe du badge de statut
function getStatusBadgeClass(status) {
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

// Fonction pour calculer la remise
function calculateDiscount(po) {
  if (!po.items || po.items.length === 0) return 0
  const subtotal = po.items.reduce((sum, item) => sum + item.total_price, 0)
  return subtotal * (po.discount / 100)
}

// Fonction pour calculer la TVA
function calculateTVA(po) {
  if (!po.items || po.items.length === 0) return 0
  const subtotal = po.items.reduce((sum, item) => sum + item.total_price, 0)
  const discountAmount = subtotal * (po.discount / 100)
  return (subtotal - discountAmount) * (po.tva / 100)
}

export default GenerateExcelPage
