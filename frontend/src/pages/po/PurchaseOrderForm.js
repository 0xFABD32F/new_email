"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import API from "../../services/api"
import "./PurchaseOrderStyles.css"

function PurchaseOrderForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const supplierIdFromQuery = queryParams.get("supplier")
  const isEditing = !!id

  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [supplierProducts, setSupplierProducts] = useState([])

  const [formData, setFormData] = useState({
    po_number: `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
    supplier_id: supplierIdFromQuery || "",
    date_creation: new Date().toISOString().split("T")[0],
    currency: "USD",
    rate: 10.5,
    eta: "2W",
    shipping_cost: 0,
    discount: 0,
    tva: 0,
    status: "Draft",
    items: [
      {
        id: Date.now(),
        product_id: "",
        qty: 1,
        unit_cost: 0,
        unit_price: 0,
        total_price: 0,
      },
    ],
  })

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true)

        // Charger les fournisseurs
        const suppliersResponse = await API.get("/suppliers/")
        setSuppliers(suppliersResponse.data)

        // Charger les produits
        const productsResponse = await API.get("/products/")
        setProducts(productsResponse.data)

        if (isEditing) {
          // Charger les données du PO existant
          const poResponse = await API.get(`/purchase-orders/${id}`)
          setFormData(poResponse.data)

          // Définir le fournisseur sélectionné
          const supplier = suppliersResponse.data.find((s) => s.id === poResponse.data.supplier_id)
          setSelectedSupplier(supplier)

          // Filtrer les produits par fournisseur
          const supplierProds = productsResponse.data.filter((p) => p.supplier_id === poResponse.data.supplier_id)
          setSupplierProducts(supplierProds)
        } else if (supplierIdFromQuery) {
          // Si un fournisseur est spécifié dans l'URL
          const supplier = suppliersResponse.data.find((s) => s.id === Number.parseInt(supplierIdFromQuery))
          if (supplier) {
            setSelectedSupplier(supplier)
            setFormData((prev) => ({
              ...prev,
              supplier_id: Number.parseInt(supplierIdFromQuery),
              currency: supplier.currency || "USD",
            }))

            // Filtrer les produits par fournisseur
            const supplierProds = productsResponse.data.filter(
              (p) => p.supplier_id === Number.parseInt(supplierIdFromQuery),
            )
            setSupplierProducts(supplierProds)
          }
        }

        setError(null)
      } catch (err) {
        console.error("Erreur de chargement:", err)
        setError("Impossible de charger les données nécessaires")
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [id, isEditing, supplierIdFromQuery])

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === "supplier_id") {
      const supplierId = Number.parseInt(value)
      const supplier = suppliers.find((s) => s.id === supplierId)
      setSelectedSupplier(supplier)

      // Mettre à jour la devise en fonction du fournisseur
      setFormData((prev) => ({
        ...prev,
        supplier_id: supplierId,
        currency: supplier?.currency || "USD",
        items: [], // Réinitialiser les articles car ils dépendent du fournisseur
      }))

      // Filtrer les produits par fournisseur
      const supplierProds = products.filter((p) => p.supplier_id === supplierId)
      setSupplierProducts(supplierProds)
    } else {
      // Assurer que les valeurs numériques sont stockées comme nombres
      let processedValue = value
      if (name === "shipping_cost" || name === "discount" || name === "tva" || name === "rate") {
        processedValue = value === "" ? 0 : Number.parseFloat(value)
      }

      setFormData((prev) => ({
        ...prev,
        [name]: processedValue,
      }))
    }
  }

  const handleItemChange = (index, e) => {
    const { name, value } = e.target
    const updatedItems = [...formData.items]

    if (name === "product_id") {
      const productId = Number.parseInt(value)
      const product = products.find((p) => p.id === productId)

      updatedItems[index] = {
        ...updatedItems[index],
        product_id: productId,
        unit_cost: product?.unit_cost || 0,
        unit_price: product?.unit_cost || 0,
        total_price: product?.unit_cost * updatedItems[index].qty || 0,
      }
    } else if (name === "qty") {
      const qty = Number.parseInt(value) || 0
      updatedItems[index] = {
        ...updatedItems[index],
        qty,
        total_price: qty * updatedItems[index].unit_cost,
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [name]: value,
      }
    }

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }))
  }

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now(),
          product_id: "",
          qty: 1,
          unit_cost: 0,
          unit_price: 0,
          total_price: 0,
        },
      ],
    }))
  }

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = [...formData.items]
      updatedItems.splice(index, 1)

      setFormData((prev) => ({
        ...prev,
        items: updatedItems,
      }))
    }
  }

  const calculateSubtotal = () => {
    return formData.items.reduce((total, item) => total + (Number.parseFloat(item.total_price) || 0), 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const shippingCost = Number.parseFloat(formData.shipping_cost) || 0
    const discountAmount = subtotal * (Number.parseFloat(formData.discount) / 100) || 0
    const tvaAmount = (subtotal - discountAmount) * (Number.parseFloat(formData.tva) / 100) || 0

    return subtotal + shippingCost - discountAmount + tvaAmount
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setSaving(true)

      // Assurer que toutes les valeurs numériques sont envoyées comme nombres
      const poData = {
        ...formData,
        supplier_id: Number.parseInt(formData.supplier_id),
        rate: Number.parseFloat(formData.rate),
        shipping_cost: Number.parseFloat(formData.shipping_cost),
        discount: Number.parseFloat(formData.discount),
        tva: Number.parseFloat(formData.tva),
        total_amount: calculateTotal(),
        items: formData.items.map((item) => ({
          ...item,
          product_id: Number.parseInt(item.product_id),
          qty: Number.parseInt(item.qty),
          unit_cost: Number.parseFloat(item.unit_cost),
          unit_price: Number.parseFloat(item.unit_price || item.unit_cost),
          total_price: Number.parseFloat(item.total_price),
        })),
      }

      if (isEditing) {
        await API.put(`/purchase-orders/${id}`, poData)
      } else {
        await API.post("/purchase-orders/", poData)
      }

      navigate("/dashboard/purchase-orders")
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err)
      setError("Une erreur est survenue lors de l'enregistrement")
      setSaving(false)
    }
  }

  const handleGeneratePDF = async (id) => {
    try {
      // Télécharger directement le PDF sans naviguer
      const pdfUrl = `${API.baseURL}/purchase-orders/${id}/generate-pdf`;
      console.log("URL de téléchargement PDF:", pdfUrl);
  
      // Créer un lien temporaire pour forcer le téléchargement
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.setAttribute("download", `PO_${id}.pdf`); // Optionnel, le serveur définit déjà le nom du fichier
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erreur lors de la génération du fichier PDF:", err);
      setError("Erreur lors de la génération du fichier PDF");
    }
  }

  if (loading) {
    return (
      <div className="po-loading">
        <div className="po-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  return (
    <div className="po-container">
      <div className="po-header">
        <div>
          <h1>
            <i className={`fas ${isEditing ? "fa-edit" : "fa-plus-circle"} me-3`}></i>
            {isEditing ? "Modifier le bon de commande" : "Créer un bon de commande"}
          </h1>
          <p>{isEditing ? "Mettez à jour les informations" : "Remplissez le formulaire"}</p>
        </div>
        <div className="po-header-actions">
          {isEditing && (
            <button className="po-btn po-btn-success" onClick={handleGeneratePDF}>
              <i className="fas fa-file-pdf me-2"></i>
              Générer PDF
            </button>
          )}
          <button className="po-btn po-btn-secondary" onClick={() => navigate("/dashboard/purchase-orders")}>
            <i className="fas fa-arrow-left me-2"></i>
            Retour
          </button>
        </div>
      </div>

      {error && (
        <div className="po-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <div className="po-card">
        <form onSubmit={handleSubmit} className="po-form">
          <div className="form-grid">
            {/* Colonne 1 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-file-invoice me-2"></i>Informations du bon de commande
                </h3>

                <div className="form-group">
                  <label htmlFor="po_number">Numéro de PO</label>
                  <div className="input-wrapper">
                    <i className="fas fa-hashtag"></i>
                    <input
                      type="text"
                      id="po_number"
                      name="po_number"
                      value={formData.po_number}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="supplier_id">Fournisseur</label>
                  <div className="input-wrapper">
                    <i className="fas fa-truck"></i>
                    <select
                      id="supplier_id"
                      name="supplier_id"
                      value={formData.supplier_id}
                      onChange={handleChange}
                      required
                      disabled={isEditing}
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.company} ({supplier.country})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="date_creation">Date de création</label>
                  <div className="input-wrapper">
                    <i className="fas fa-calendar-alt"></i>
                    <input
                      type="date"
                      id="date_creation"
                      name="date_creation"
                      value={formData.date_creation}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="status">Statut</label>
                  <div className="input-wrapper">
                    <i className="fas fa-tasks"></i>
                    <select id="status" name="status" value={formData.status} onChange={handleChange} required>
                      <option value="Draft">Brouillon</option>
                      <option value="Sent">Envoyé</option>
                      <option value="Confirmed">Confirmé</option>
                      <option value="Delivered">Livré</option>
                      <option value="Cancelled">Annulé</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>
                  <i className="fas fa-money-bill-wave me-2"></i>Informations financières
                </h3>

                <div className="form-group">
                  <label htmlFor="currency">Devise</label>
                  <div className="input-wrapper">
                    <i className="fas fa-dollar-sign"></i>
                    <select id="currency" name="currency" value={formData.currency} onChange={handleChange} required>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="MAD">MAD</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="rate">Taux de change</label>
                  <div className="input-wrapper">
                    <i className="fas fa-exchange-alt"></i>
                    <input
                      type="number"
                      id="rate"
                      name="rate"
                      value={formData.rate}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="eta">ETA (délai estimé)</label>
                  <div className="input-wrapper">
                    <i className="fas fa-clock"></i>
                    <input
                      type="text"
                      id="eta"
                      name="eta"
                      value={formData.eta}
                      onChange={handleChange}
                      placeholder="Ex: 2W, 4W"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne 2 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-truck-loading me-2"></i>Frais additionnels
                </h3>

                <div className="form-group">
                  <label htmlFor="shipping_cost">Frais de livraison</label>
                  <div className="input-wrapper">
                    <i className="fas fa-shipping-fast"></i>
                    <input
                      type="number"
                      id="shipping_cost"
                      name="shipping_cost"
                      value={formData.shipping_cost}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="discount">Remise (%)</label>
                  <div className="input-wrapper">
                    <i className="fas fa-percentage"></i>
                    <input
                      type="number"
                      id="discount"
                      name="discount"
                      value={formData.discount}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="tva">TVA (%)</label>
                  <div className="input-wrapper">
                    <i className="fas fa-receipt"></i>
                    <input
                      type="number"
                      id="tva"
                      name="tva"
                      value={formData.tva}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {selectedSupplier && (
                <div className="form-section">
                  <h3>
                    <i className="fas fa-info-circle me-2"></i>Informations du fournisseur
                  </h3>
                  <div className="supplier-info">
                    <p>
                      <strong>Société:</strong> {selectedSupplier.company}
                    </p>
                    <p>
                      <strong>Contact:</strong> {selectedSupplier.contact_name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedSupplier.email}
                    </p>
                    <p>
                      <strong>Téléphone:</strong> {selectedSupplier.phone}
                    </p>
                    <p>
                      <strong>Conditions de paiement:</strong> {selectedSupplier.payment_terms}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Articles du bon de commande */}
          <div className="form-section mt-4">
            <h3>
              <i className="fas fa-list me-2"></i>Articles
            </h3>

            {formData.supplier_id ? (
              <>
                <div className="po-items-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th>Référence</th>
                        <th>Quantité</th>
                        <th>Prix unitaire</th>
                        <th>Total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={item.id}>
                          <td>
                            <select
                              name="product_id"
                              value={item.product_id}
                              onChange={(e) => handleItemChange(index, e)}
                              required
                            >
                              <option value="">Sélectionner un produit</option>
                              {supplierProducts.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.pn} - {product.eq_reference}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {item.product_id &&
                              products.find((p) => p.id === Number.parseInt(item.product_id))?.eq_reference}
                          </td>
                          <td>
                            <input
                              type="number"
                              name="qty"
                              value={item.qty}
                              onChange={(e) => handleItemChange(index, e)}
                              min="1"
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              name="unit_cost"
                              value={item.unit_cost}
                              onChange={(e) => handleItemChange(index, e)}
                              step="0.01"
                              min="0"
                              required
                              readOnly
                            />
                          </td>
                          <td>{Number.parseFloat(item.total_price).toFixed(2)}</td>
                          <td>
                            <button
                              type="button"
                              className="po-btn-action po-delete"
                              onClick={() => removeItem(index)}
                              disabled={formData.items.length <= 1}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4" className="text-right">
                          <strong>Sous-total:</strong>
                        </td>
                        <td colSpan="2">
                          <strong>{calculateSubtotal().toFixed(2)}</strong>
                        </td>
                      </tr>
                      {Number.parseFloat(formData.shipping_cost) > 0 && (
                        <tr>
                          <td colSpan="4" className="text-right">
                            Frais de livraison:
                          </td>
                          <td colSpan="2">{Number.parseFloat(formData.shipping_cost).toFixed(2)}</td>
                        </tr>
                      )}
                      {Number.parseFloat(formData.discount) > 0 && (
                        <tr>
                          <td colSpan="4" className="text-right">
                            Remise ({formData.discount}%):
                          </td>
                          <td colSpan="2">
                            -{(calculateSubtotal() * (Number.parseFloat(formData.discount) / 100)).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {Number.parseFloat(formData.tva) > 0 && (
                        <tr>
                          <td colSpan="4" className="text-right">
                            TVA ({formData.tva}%):
                          </td>
                          <td colSpan="2">
                            {(
                              (calculateSubtotal() -
                                calculateSubtotal() * (Number.parseFloat(formData.discount) / 100)) *
                              (Number.parseFloat(formData.tva) / 100)
                            ).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan="4" className="text-right">
                          <strong>Total:</strong>
                        </td>
                        <td colSpan="2">
                          <strong>{calculateTotal().toFixed(2)}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <button type="button" className="po-btn po-btn-secondary mt-3" onClick={addItem}>
                  <i className="fas fa-plus me-2"></i>Ajouter un article
                </button>
              </>
            ) : (
              <div className="po-empty-state">
                <i className="fas fa-info-circle"></i>
                <p>Veuillez d'abord sélectionner un fournisseur pour ajouter des articles.</p>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="po-btn po-btn-secondary"
              onClick={() => navigate("/dashboard/purchase-orders")}
              disabled={saving}
            >
              <i className="fas fa-times me-2"></i>
              Annuler
            </button>
            <button type="submit" className="po-btn po-btn-primary" disabled={saving || !formData.supplier_id}>
              {saving ? (
                <>
                  <div className="po-spinner-sm"></div>
                  {isEditing ? "Mise à jour..." : "Création..."}
                </>
              ) : (
                <>
                  <i className={`fas ${isEditing ? "fa-save" : "fa-plus-circle"} me-2`}></i>
                  {isEditing ? "Mettre à jour" : "Créer le bon de commande"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PurchaseOrderForm
