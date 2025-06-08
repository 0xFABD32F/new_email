"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../../services/api"
import ProductShippingCalculator from "../../components/ProductShippingCalculator"
import "./ProductsStyles.css"

function ProductsForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id
  const isMounted = useRef(true)

  const [suppliers, setSuppliers] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [supplierBrands, setSupplierBrands] = useState([])
  const [shippingInfo, setShippingInfo] = useState(null)

  const [formData, setFormData] = useState({
    brand: "",
    supplier_id: "",
    pn: "",
    eq_reference: "",
    description: "",
    unit_cost: 0,
    currency: "USD",
    rate: 10.5,
    shipping_discount: 0,
    unit_cost_mad: 0,
    p_margin: 20,
    customer_id: "",
    devis_number: "",
    country: "",
    qty: 1,
    total_price: 0,
    eta: "",
    transit: "",
    douane: "",
    poids_kg: "",
    dimensions: "",
  })

  // Effet pour marquer le composant comme démonté lors du nettoyage
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Fonction sécurisée pour mettre à jour l'état
  const safeSetState = useCallback((setter, value) => {
    if (isMounted.current) {
      setter(value)
    }
  }, [])

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        safeSetState(setLoading, true)

        // Charger les fournisseurs
        const suppliersResponse = await API.get("/suppliers/")
        safeSetState(setSuppliers, suppliersResponse.data)

        // Charger les clients
        const clientsResponse = await API.get("/clients/")
        safeSetState(setClients, clientsResponse.data)

        if (isEditing) {
          // Charger les données du produit existant
          const productResponse = await API.get(`/products/${id}`)
          safeSetState(setFormData, productResponse.data)

          // Si le produit a un fournisseur, charger ses marques
          if (productResponse.data.supplier_id) {
            fetchSupplierBrands(productResponse.data.supplier_id)
          }

          // Essayer de charger les informations de transport
          try {
            const shippingResponse = await API.get(`/product-shipping/${id}`)
            safeSetState(setShippingInfo, shippingResponse.data)
          } catch (err) {
            // Pas d'informations de transport, ce n'est pas une erreur
            console.log("Pas d'informations de transport pour ce produit")
          }
        }

        safeSetState(setError, null)
      } catch (err) {
        console.error("Erreur de chargement:", err)
        safeSetState(setError, "Impossible de charger les données nécessaires")
      } finally {
        safeSetState(setLoading, false)
      }
    }

    fetchInitialData()
  }, [id, isEditing, safeSetState])

  // Fonction pour récupérer les marques d'un fournisseur
  const fetchSupplierBrands = async (supplierId) => {
    try {
      const response = await API.get(`/products/brands/supplier/${supplierId}`)
      safeSetState(setSupplierBrands, response.data)
    } catch (err) {
      console.error("Erreur lors du chargement des marques:", err)
      safeSetState(setSupplierBrands, [])
    }
  }

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target

      // Si le fournisseur change, récupérer ses marques
      if (name === "supplier_id" && value) {
        fetchSupplierBrands(value)
      }

      // Créer une copie du formData avec la nouvelle valeur
      const updatedFormData = {
        ...formData,
        [name]: value,
      }

      // Calculs automatiques
      if (name === "unit_cost" || name === "currency" || name === "rate") {
        // Recalculer le coût unitaire en MAD
        const unitCost = Number.parseFloat(name === "unit_cost" ? value : updatedFormData.unit_cost) || 0
        const rate = Number.parseFloat(name === "rate" ? value : updatedFormData.rate) || 1
        updatedFormData.unit_cost_mad = updatedFormData.currency === "MAD" ? unitCost : unitCost * rate
      }

      if (name === "unit_cost" || name === "qty") {
        // Recalculer le prix total
        const unitCost = Number.parseFloat(name === "unit_cost" ? value : updatedFormData.unit_cost) || 0
        const qty = Number.parseInt(name === "qty" ? value : updatedFormData.qty) || 1
        updatedFormData.total_price = unitCost * qty
      }

      safeSetState(setFormData, updatedFormData)
    },
    [formData, safeSetState],
  )

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()

      try {
        safeSetState(setSaving, true)

        const productData = {
          ...formData,
          supplier_id: Number.parseInt(formData.supplier_id) || null,
          customer_id: Number.parseInt(formData.customer_id) || null,
          unit_cost: Number.parseFloat(formData.unit_cost) || 0,
          rate: Number.parseFloat(formData.rate) || 1,
          shipping_discount: Number.parseFloat(formData.shipping_discount) || 0,
          unit_cost_mad: Number.parseFloat(formData.unit_cost_mad) || 0,
          p_margin: Number.parseFloat(formData.p_margin) || 0,
          qty: Number.parseInt(formData.qty) || 1,
          total_price: Number.parseFloat(formData.total_price) || 0,
          poids_kg: formData.poids_kg ? Number.parseFloat(formData.poids_kg) : null,
        }

        let savedProduct

        if (isEditing) {
          const response = await API.put(`/products/${id}`, productData)
          savedProduct = response.data
        } else {
          const response = await API.post("/products/", productData)
          savedProduct = response.data
        }

        // Si nous avons des informations de transport et un poids défini, mettre à jour les informations de transport
        if (formData.poids_kg && shippingInfo) {
          try {
            await API.post(`/product-shipping/${savedProduct.id}/shipping`, {
              weight_kg: Number.parseFloat(formData.poids_kg),
              dimensions: formData.dimensions || null,
              destination_country: formData.country || "France",
              direction: "export",
              premium_service: shippingInfo?.premium_service || null,
            })
          } catch (err) {
            console.error("Erreur lors de la mise à jour des informations de transport:", err)
            // Ne pas bloquer la sauvegarde si la mise à jour des informations de transport échoue
          }
        }

        navigate("/dashboard/products")
      } catch (err) {
        console.error("Erreur lors de l'enregistrement:", err)
        if (err.response && err.response.data && err.response.data.detail) {
          safeSetState(setError, err.response.data.detail)
        } else {
          safeSetState(setError, "Une erreur est survenue lors de l'enregistrement")
        }
        safeSetState(setSaving, false)
      }
    },
    [formData, isEditing, id, shippingInfo, navigate, safeSetState],
  )

  const handleShippingCalculated = useCallback(
    (result) => {
      // Mettre à jour les informations de transport
      safeSetState(setShippingInfo, result)
    },
    [safeSetState],
  )

  if (loading) {
    return (
      <div className="products-loading">
        <div className="products-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  return (
    <div className="products-container">
      <div className="products-header">
        <div>
          <h1>
            <i className={`fas ${isEditing ? "fa-edit" : "fa-plus-circle"} me-3`}></i>
            {isEditing ? "Modifier le produit" : "Ajouter un produit"}
          </h1>
          <p>{isEditing ? "Mettez à jour les informations" : "Remplissez le formulaire"}</p>
        </div>
        <button className="products-btn products-btn-secondary" onClick={() => navigate("/dashboard/products")}>
          <i className="fas fa-arrow-left me-2"></i>
          Retour
        </button>
      </div>

      {error && (
        <div className="products-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <div className="products-card">
        <form onSubmit={handleSubmit} className="products-form">
          <div className="form-grid">
            {/* Colonne 1 - Informations de base */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-info-circle me-2"></i>Informations du produit
                </h3>

                <div className="form-group">
                  <label htmlFor="supplier_id">Fournisseur</label>
                  <div className="input-wrapper">
                    <i className="fas fa-truck"></i>
                    <select
                      id="supplier_id"
                      name="supplier_id"
                      value={formData.supplier_id || ""}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.company} ({supplier.country || "N/A"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="brand">Marque</label>
                  <div className="input-wrapper">
                    <i className="fas fa-tag"></i>
                    {supplierBrands.length > 0 ? (
                      <select id="brand" name="brand" value={formData.brand || ""} onChange={handleChange}>
                        <option value="">Sélectionner une marque</option>
                        {supplierBrands.map((brand, index) => (
                          <option key={index} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        id="brand"
                        name="brand"
                        value={formData.brand || ""}
                        onChange={handleChange}
                        placeholder={
                          formData.supplier_id
                            ? "Aucune marque trouvée pour ce fournisseur"
                            : "Sélectionnez d'abord un fournisseur"
                        }
                      />
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="pn">Référence (PN)</label>
                  <div className="input-wrapper">
                    <i className="fas fa-barcode"></i>
                    <input type="text" id="pn" name="pn" value={formData.pn || ""} onChange={handleChange} required />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="eq_reference">Description de l'équipement</label>
                  <div className="input-wrapper">
                    <i className="fas fa-file-alt"></i>
                    <textarea
                      id="eq_reference"
                      name="eq_reference"
                      value={formData.eq_reference || ""}
                      onChange={handleChange}
                      rows="3"
                    ></textarea>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description détaillée</label>
                  <div className="input-wrapper">
                    <i className="fas fa-align-left"></i>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description || ""}
                      onChange={handleChange}
                      rows="4"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>
                  <i className="fas fa-money-bill-wave me-2"></i>Informations financières
                </h3>

                <div className="form-group">
                  <label htmlFor="unit_cost">Coût unitaire</label>
                  <div className="input-wrapper">
                    <i className="fas fa-dollar-sign"></i>
                    <input
                      type="number"
                      id="unit_cost"
                      name="unit_cost"
                      value={formData.unit_cost || 0}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="currency">Devise</label>
                  <div className="input-wrapper">
                    <i className="fas fa-money-bill"></i>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency || "USD"}
                      onChange={handleChange}
                      required
                    >
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
                      value={formData.rate || 1}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      disabled={formData.currency === "MAD"}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="shipping_discount">Remise sur expédition</label>
                  <div className="input-wrapper">
                    <i className="fas fa-percentage"></i>
                    <input
                      type="number"
                      id="shipping_discount"
                      name="shipping_discount"
                      value={formData.shipping_discount || 0}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="unit_cost_mad">Coût unitaire (MAD)</label>
                  <div className="input-wrapper">
                    <i className="fas fa-calculator"></i>
                    <input
                      type="number"
                      id="unit_cost_mad"
                      name="unit_cost_mad"
                      value={formData.unit_cost_mad || 0}
                      readOnly
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="p_margin">Marge (%)</label>
                  <div className="input-wrapper">
                    <i className="fas fa-percentage"></i>
                    <input
                      type="number"
                      id="p_margin"
                      name="p_margin"
                      value={formData.p_margin || 0}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne 2 - Informations client et livraison */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-user me-2"></i>Informations client
                </h3>

                <div className="form-group">
                  <label htmlFor="customer_id">Client</label>
                  <div className="input-wrapper">
                    <i className="fas fa-building"></i>
                    <select
                      id="customer_id"
                      name="customer_id"
                      value={formData.customer_id || ""}
                      onChange={handleChange}
                    >
                      <option value="">Sélectionner un client (optionnel)</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="devis_number">Numéro de devis</label>
                  <div className="input-wrapper">
                    <i className="fas fa-file-invoice"></i>
                    <input
                      type="text"
                      id="devis_number"
                      name="devis_number"
                      value={formData.devis_number || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="country">Pays</label>
                  <div className="input-wrapper">
                    <i className="fas fa-globe"></i>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="qty">Quantité</label>
                  <div className="input-wrapper">
                    <i className="fas fa-sort-amount-up"></i>
                    <input
                      type="number"
                      id="qty"
                      name="qty"
                      value={formData.qty || 1}
                      onChange={handleChange}
                      min="1"
                      step="1"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="total_price">Prix total</label>
                  <div className="input-wrapper">
                    <i className="fas fa-money-bill-wave"></i>
                    <input
                      type="number"
                      id="total_price"
                      name="total_price"
                      value={formData.total_price || 0}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>
                  <i className="fas fa-shipping-fast me-2"></i>Informations de livraison
                </h3>

                <div className="form-group">
                  <label htmlFor="poids_kg">Poids (kg)</label>
                  <div className="input-wrapper">
                    <i className="fas fa-weight"></i>
                    <input
                      type="number"
                      id="poids_kg"
                      name="poids_kg"
                      value={formData.poids_kg || ""}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      placeholder="Ex: 1.5"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="dimensions">Dimensions (LxlxH cm)</label>
                  <div className="input-wrapper">
                    <i className="fas fa-ruler-combined"></i>
                    <input
                      type="text"
                      id="dimensions"
                      name="dimensions"
                      value={formData.dimensions || ""}
                      onChange={handleChange}
                      placeholder="Ex: 30x20x15"
                    />
                  </div>
                  <small className="form-text text-muted">Format: Longueur x largeur x hauteur en centimètres</small>
                </div>

                <div className="form-group">
                  <label htmlFor="eta">Date estimée d'arrivée (ETA)</label>
                  <div className="input-wrapper">
                    <i className="fas fa-calendar-alt"></i>
                    <input
                      type="text"
                      id="eta"
                      name="eta"
                      value={formData.eta || ""}
                      onChange={handleChange}
                      placeholder="Ex: 15/12/2023"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="transit">Statut de transit</label>
                  <div className="input-wrapper">
                    <i className="fas fa-truck-moving"></i>
                    <select id="transit" name="transit" value={formData.transit || ""} onChange={handleChange}>
                      <option value="">Sélectionner un statut</option>
                      <option value="En attente">En attente</option>
                      <option value="En transit">En transit</option>
                      <option value="Livré">Livré</option>
                      <option value="Retardé">Retardé</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="douane">Statut douane</label>
                  <div className="input-wrapper">
                    <i className="fas fa-clipboard-check"></i>
                    <select id="douane" name="douane" value={formData.douane || ""} onChange={handleChange}>
                      <option value="">Sélectionner un statut</option>
                      <option value="En attente">En attente</option>
                      <option value="En cours">En cours</option>
                      <option value="Dédouané">Dédouané</option>
                      <option value="Bloqué">Bloqué</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section calculateur de frais de transport */}
          {isEditing && formData.id && formData.poids_kg > 0 && (
            <div className="form-section">
              <h3>
                <i className="fas fa-truck-loading me-2"></i>
                Calculer les frais de transport
              </h3>

              <ProductShippingCalculator
                productId={formData.id}
                initialWeight={formData.poids_kg}
                initialCountry={formData.country || "France"}
                initialDimensions={formData.dimensions || ""}
                type="product"
                onCalculate={handleShippingCalculated}
              />

              {shippingInfo && (
                <div className="shipping-summary">
                  <div className="shipping-total">
                    <span>Frais de transport estimés:</span>
                    <strong>{shippingInfo.shipping_cost?.toLocaleString("fr-FR")} MAD</strong>
                  </div>
                  <p className="shipping-note">
                    <i className="fas fa-info-circle me-2"></i>
                    Ces frais sont basés sur les tarifs DHL et peuvent varier.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="products-btn products-btn-secondary"
              onClick={() => navigate("/dashboard/products")}
              disabled={saving}
            >
              <i className="fas fa-times me-2"></i>
              Annuler
            </button>
            <button type="submit" className="products-btn products-btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <div className="products-spinner-sm"></div>
                  {isEditing ? "Mise à jour..." : "Création..."}
                </>
              ) : (
                <>
                  <i className={`fas ${isEditing ? "fa-save" : "fa-plus-circle"} me-2`}></i>
                  {isEditing ? "Mettre à jour" : "Créer le produit"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductsForm
