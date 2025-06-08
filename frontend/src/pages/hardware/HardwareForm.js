"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../../services/api"
import ShippingCalculator from "../../components/ShippingCalculator"
import "./HardwareStyles.css"

function HardwareForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id
  const isMounted = useRef(true)

  const [suppliers, setSuppliers] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [supplierBrands, setSupplierBrands] = useState([])
  const [defaultBrands, setDefaultBrands] = useState([
    "Cisco",
    "HPE",
    "Dell",
    "Seagate",
    "Fortinet",
    "Palo Alto",
    "Juniper",
    "QNAP",
    "Synology",
  ])
  const [shippingInfo, setShippingInfo] = useState(null)

  // Fonction sécurisée pour mettre à jour l'état
  const safeSetState = useCallback((setter, value) => {
    if (isMounted.current) {
      setter(value)
    }
  }, [])

  // Effet pour marquer le composant comme démonté lors du nettoyage
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const [formData, setFormData] = useState({
    brand: "",
    supplier_id: "",
    pn: "",
    eq_reference: "",
    unit_cost: 0,
    currency: "USD",
    rate: 10.5,
    shipping_discount: 0,
    unit_cost_mad: 0,
    p_margin: 20,
    transit: "",
    douane: "",
    unit_price: 0,
    qty: 1,
    total_cost: 0,
    total_price: 0,
    eta: "",
    status: "ongoing",
    devis_number: "",
    project_reference: "",
    customer_id: "",
    country: "",
    poids_kg: "",
    dimensions: "",
  })

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        safeSetState(setLoading, true)

        // Charger les fournisseurs et les clients
        const [suppliersResponse, customersResponse] = await Promise.all([API.get("/suppliers/"), API.get("/clients/")])

        safeSetState(setSuppliers, suppliersResponse.data)
        safeSetState(setCustomers, customersResponse.data)

        if (isEditing) {
          // Charger les données de l'équipement existant
          const hardwareResponse = await API.get(`/hardware/${id}`)
          safeSetState(setFormData, hardwareResponse.data)

          // Définir le fournisseur sélectionné
          const supplier = suppliersResponse.data.find((s) => s.id === hardwareResponse.data.supplier_id)
          safeSetState(setSelectedSupplier, supplier)

          // Charger les marques du fournisseur si un fournisseur est sélectionné
          if (hardwareResponse.data.supplier_id) {
            try {
              const brandsBySupplierResponse = await API.get(
                `/hardware/brands-by-supplier/${hardwareResponse.data.supplier_id}`,
              )
              safeSetState(setSupplierBrands, brandsBySupplierResponse.data || [])
            } catch (err) {
              console.error("Erreur lors du chargement des marques du fournisseur:", err)
              // En cas d'erreur, on utilise les marques par défaut
            }
          }

          // Essayer de charger les informations de transport
          try {
            const shippingResponse = await API.get(`/hardware/${id}/shipping`)
            safeSetState(setShippingInfo, shippingResponse.data)
          } catch (err) {
            // Pas d'informations de transport, ce n'est pas une erreur
            console.log("Pas d'informations de transport pour cet équipement")
          }
        }

        safeSetState(setError, null)
      } catch (err) {
        console.error("Erreur de chargement:", err)
        if (isMounted.current) {
          safeSetState(setError, "Impossible de charger les données nécessaires")
        }
      } finally {
        if (isMounted.current) {
          safeSetState(setLoading, false)
        }
      }
    }

    fetchInitialData()
  }, [id, isEditing, safeSetState])

  const calculateDerivedValues = useCallback((data) => {
    const unitCost = Number.parseFloat(data.unit_cost) || 0
    const rate = Number.parseFloat(data.rate) || 10.5
    const shippingDiscount = Number.parseFloat(data.shipping_discount) || 0
    const unitCostMad = unitCost * rate * (1 - shippingDiscount / 100)
    const margin = Number.parseFloat(data.p_margin) || 0
    const unitPrice = unitCostMad * (1 + margin / 100)
    const qty = Number.parseInt(data.qty) || 1
    const totalCost = unitCostMad * qty
    const totalPrice = unitPrice * qty

    return {
      ...data,
      unit_cost_mad: unitCostMad,
      unit_price: unitPrice,
      total_cost: totalCost,
      total_price: totalPrice,
    }
  }, [])

  const handleChange = useCallback(
    async (e) => {
      const { name, value } = e.target

      if (name === "supplier_id") {
        const supplierId = Number.parseInt(value)
        const supplier = suppliers.find((s) => s.id === supplierId)
        safeSetState(setSelectedSupplier, supplier)

        safeSetState(setFormData, (prev) => {
          const newData = {
            ...prev,
            supplier_id: supplierId,
            country: supplier?.country || "",
            // Réinitialiser la marque si on change de fournisseur
            brand: "",
          }
          return calculateDerivedValues(newData)
        })

        // Charger les marques du fournisseur sélectionné
        try {
          if (supplierId) {
            try {
              const brandsBySupplierResponse = await API.get(`/hardware/brands-by-supplier/${supplierId}`)
              safeSetState(setSupplierBrands, brandsBySupplierResponse.data || [])
            } catch (err) {
              console.error("Erreur lors du chargement des marques:", err)
              // En cas d'erreur, utiliser les marques par défaut
              safeSetState(setSupplierBrands, [])
            }
          } else {
            safeSetState(setSupplierBrands, [])
          }
        } catch (err) {
          console.error("Erreur lors du chargement des marques:", err)
          // En cas d'erreur, on garde les marques actuelles
        }
      } else if (["unit_cost", "rate", "shipping_discount", "p_margin", "qty"].includes(name)) {
        // Recalculer les valeurs dérivées
        safeSetState(setFormData, (prev) => {
          const newData = {
            ...prev,
            [name]: value,
          }
          return calculateDerivedValues(newData)
        })
      } else {
        safeSetState(setFormData, (prev) => ({
          ...prev,
          [name]: value,
        }))
      }
    },
    [suppliers, safeSetState, calculateDerivedValues],
  )

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()

      try {
        safeSetState(setSaving, true)

        // Assurer que toutes les valeurs numériques sont envoyées comme nombres
        const hardwareData = {
          ...formData,
          supplier_id: Number.parseInt(formData.supplier_id),
          unit_cost: Number.parseFloat(formData.unit_cost),
          rate: Number.parseFloat(formData.rate),
          shipping_discount: Number.parseFloat(formData.shipping_discount),
          unit_cost_mad: Number.parseFloat(formData.unit_cost_mad),
          p_margin: Number.parseFloat(formData.p_margin),
          unit_price: Number.parseFloat(formData.unit_price),
          qty: Number.parseInt(formData.qty),
          total_cost: Number.parseFloat(formData.total_cost),
          total_price: Number.parseFloat(formData.total_price),
          customer_id: formData.customer_id ? Number.parseInt(formData.customer_id) : null,
          poids_kg: formData.poids_kg ? Number.parseFloat(formData.poids_kg) : null,
        }

        let savedHardware

        if (isEditing) {
          const response = await API.put(`/hardware/${id}`, hardwareData)
          savedHardware = response.data
        } else {
          const response = await API.post("/hardware/", hardwareData)
          savedHardware = response.data
        }

        // Si nous avons des informations de transport et un poids défini, mettre à jour les informations de transport
        if (formData.poids_kg) {
          try {
            await API.post(`/hardware/${savedHardware.id}/shipping`, {
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

        navigate("/dashboard/hardware")
      } catch (err) {
        console.error("Erreur lors de l'enregistrement:", err)
        if (isMounted.current) {
          safeSetState(setError, "Une erreur est survenue lors de l'enregistrement")
          safeSetState(setSaving, false)
        }
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

  // Déterminer quelles marques afficher
  const brandsToDisplay = supplierBrands.length > 0 ? supplierBrands : defaultBrands

  if (loading) {
    return (
      <div className="hw-loading">
        <div className="hw-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  return (
    <div className="hw-container">
      <div className="hw-header">
        <div>
          <h1>
            <i className={`fas ${isEditing ? "fa-edit" : "fa-plus-circle"} me-3`}></i>
            {isEditing ? "Modifier l'équipement" : "Ajouter un équipement"}
          </h1>
          <p>{isEditing ? "Mettez à jour les informations" : "Remplissez le formulaire"}</p>
        </div>
        <button className="hw-btn hw-btn-secondary" onClick={() => navigate("/dashboard/hardware")}>
          <i className="fas fa-arrow-left me-2"></i>
          Retour
        </button>
      </div>

      {error && (
        <div className="hw-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <div className="hw-card">
        <form onSubmit={handleSubmit} className="hw-form">
          <div className="form-grid">
            {/* Colonne 1 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-microchip me-2"></i>Informations de l'équipement
                </h3>

                <div className="form-group">
                  <label htmlFor="supplier_id">
                    Fournisseur <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <i className="fas fa-truck"></i>
                    <select
                      id="supplier_id"
                      name="supplier_id"
                      value={formData.supplier_id}
                      onChange={handleChange}
                      required
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
                  <label htmlFor="brand">
                    Marque <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <i className="fas fa-tag"></i>
                    <select id="brand" name="brand" value={formData.brand} onChange={handleChange} required>
                      <option value="">Sélectionner une marque</option>
                      {brandsToDisplay.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!formData.supplier_id && (
                    <small className="form-text text-muted">
                      Sélectionnez un fournisseur pour voir ses marques spécifiques.
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="country">Pays</label>
                  <div className="input-wrapper">
                    <i className="fas fa-globe"></i>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="Ex: France"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="pn">
                    Numéro de pièce (PN) <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <i className="fas fa-barcode"></i>
                    <input type="text" id="pn" name="pn" value={formData.pn} onChange={handleChange} required />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="eq_reference">
                    Référence équipement <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <i className="fas fa-file-alt"></i>
                    <input
                      type="text"
                      id="eq_reference"
                      name="eq_reference"
                      value={formData.eq_reference}
                      onChange={handleChange}
                      required
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
                      value={formData.qty}
                      onChange={handleChange}
                      min="1"
                      step="1"
                    />
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
                    <i className="fas fa-money-bill"></i>
                    <input
                      type="number"
                      id="unit_cost"
                      name="unit_cost"
                      value={formData.unit_cost}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="currency">Devise</label>
                  <div className="input-wrapper">
                    <i className="fas fa-dollar-sign"></i>
                    <select id="currency" name="currency" value={formData.currency} onChange={handleChange}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="MAD">MAD</option>
                      <option value="GBP">GBP</option>
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
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="shipping_discount">Remise transport (%)</label>
                  <div className="input-wrapper">
                    <i className="fas fa-percentage"></i>
                    <input
                      type="number"
                      id="shipping_discount"
                      name="shipping_discount"
                      value={formData.shipping_discount}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="unit_cost_mad">
                    Coût unitaire (MAD) <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <i className="fas fa-money-bill"></i>
                    <input
                      type="number"
                      id="unit_cost_mad"
                      name="unit_cost_mad"
                      value={formData.unit_cost_mad}
                      readOnly
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <small className="form-text text-muted">
                    Calculé: unit_cost * rate * (1 - shipping_discount/100)
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="p_margin">
                    Marge (%) <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <i className="fas fa-percentage"></i>
                    <input
                      type="number"
                      id="p_margin"
                      name="p_margin"
                      value={formData.p_margin}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="unit_price">Prix unitaire</label>
                  <div className="input-wrapper">
                    <i className="fas fa-tag"></i>
                    <input type="number" id="unit_price" name="unit_price" value={formData.unit_price} readOnly />
                  </div>
                  <small className="form-text text-muted">Calculé: unit_cost_mad * (1 + p_margin/100)</small>
                </div>

                <div className="form-group">
                  <label htmlFor="total_cost">Coût total</label>
                  <div className="input-wrapper">
                    <i className="fas fa-calculator"></i>
                    <input type="number" id="total_cost" name="total_cost" value={formData.total_cost} readOnly />
                  </div>
                  <small className="form-text text-muted">Calculé: unit_cost_mad * qty</small>
                </div>

                <div className="form-group">
                  <label htmlFor="total_price">Prix total</label>
                  <div className="input-wrapper">
                    <i className="fas fa-calculator"></i>
                    <input type="number" id="total_price" name="total_price" value={formData.total_price} readOnly />
                  </div>
                  <small className="form-text text-muted">Calculé: unit_price * qty</small>
                </div>
              </div>
            </div>

            {/* Colonne 2 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-file-invoice me-2"></i>Informations commerciales
                </h3>

                <div className="form-group">
                  <label htmlFor="devis_number">Numéro de devis</label>
                  <div className="input-wrapper">
                    <i className="fas fa-file-invoice-dollar"></i>
                    <input
                      type="text"
                      id="devis_number"
                      name="devis_number"
                      value={formData.devis_number || ""}
                      onChange={handleChange}
                      placeholder="Ex: SAP050"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="project_reference">Référence projet</label>
                  <div className="input-wrapper">
                    <i className="fas fa-project-diagram"></i>
                    <input
                      type="text"
                      id="project_reference"
                      name="project_reference"
                      value={formData.project_reference || ""}
                      onChange={handleChange}
                      placeholder="Ex: PROJ-2023-001"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="customer_id">Client</label>
                  <div className="input-wrapper">
                    <i className="fas fa-user-tie"></i>
                    <select
                      id="customer_id"
                      name="customer_id"
                      value={formData.customer_id || ""}
                      onChange={handleChange}
                    >
                      <option value="">Sélectionner un client</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="status">Statut</label>
                  <div className="input-wrapper">
                    <i className="fas fa-tasks"></i>
                    <select id="status" name="status" value={formData.status || "ongoing"} onChange={handleChange}>
                      <option value="ongoing">En cours</option>
                      <option value="ok">Terminé</option>
                      <option value="pending">En attente</option>
                      <option value="cancelled">Annulé</option>
                    </select>
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
                      placeholder="Ex: 2W, 6W"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="transit">Transit</label>
                  <div className="input-wrapper">
                    <i className="fas fa-truck-moving"></i>
                    <input
                      type="text"
                      id="transit"
                      name="transit"
                      value={formData.transit || ""}
                      onChange={handleChange}
                      placeholder="Statut de transit"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="douane">Douane</label>
                  <div className="input-wrapper">
                    <i className="fas fa-clipboard-check"></i>
                    <input
                      type="text"
                      id="douane"
                      name="douane"
                      value={formData.douane || ""}
                      onChange={handleChange}
                      placeholder="Statut douanier"
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
                      <strong>Pays:</strong> {selectedSupplier.country}
                    </p>
                    {selectedSupplier.contact_name && (
                      <p>
                        <strong>Contact:</strong> {selectedSupplier.contact_name}
                      </p>
                    )}
                    {selectedSupplier.email && (
                      <p>
                        <strong>Email:</strong> {selectedSupplier.email}
                      </p>
                    )}
                    {selectedSupplier.phone && (
                      <p>
                        <strong>Téléphone:</strong> {selectedSupplier.phone}
                      </p>
                    )}
                    {selectedSupplier.brand && (
                      <p>
                        <strong>Marque principale:</strong> {selectedSupplier.brand}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section calculateur de frais de transport */}
          {isEditing && formData.id && formData.poids_kg > 0 && (
            <div className="form-section">
              <h3>
                <i className="fas fa-truck-loading me-2"></i>
                Calculer les frais de transport
              </h3>

              <ShippingCalculator
                hardwareId={formData.id}
                initialWeight={formData.poids_kg}
                initialCountry={formData.country || "France"}
                type="hardware"
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
              className="hw-btn hw-btn-secondary"
              onClick={() => navigate("/dashboard/hardware")}
              disabled={saving}
            >
              <i className="fas fa-times me-2"></i>
              Annuler
            </button>
            <button type="submit" className="hw-btn hw-btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <div className="hw-spinner-sm"></div>
                  {isEditing ? "Mise à jour..." : "Création..."}
                </>
              ) : (
                <>
                  <i className={`fas ${isEditing ? "fa-save" : "fa-plus-circle"} me-2`}></i>
                  {isEditing ? "Mettre à jour" : "Créer l'équipement"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default HardwareForm
