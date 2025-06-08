"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Link } from "react-router-dom"
import API from "../../services/api"
import "../../components/ShippingStyles.css"
import React from "react"

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Erreur capturée par ErrorBoundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="shipping-error">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <h3>Une erreur est survenue</h3>
          <p>Veuillez rafraîchir la page ou contacter le support technique.</p>
          <button className="shipping-btn shipping-btn-primary" onClick={() => this.setState({ hasError: false })}>
            <i className="fas fa-sync-alt me-2"></i>Réessayer
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

function ShippingDashboard() {
  const isMounted = useRef(true)
  const [hardwareShippingData, setHardwareShippingData] = useState([])
  const [productShippingData, setProductShippingData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCountry, setFilterCountry] = useState("")
  const [filterDirection, setFilterDirection] = useState("")
  const [countries, setCountries] = useState([])
  const [activeTab, setActiveTab] = useState("hardware") // "hardware" ou "products"

  const safeSetState = useCallback((setter, value) => {
    if (isMounted.current) {
      setter(value)
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchShippingData = useCallback(async () => {
    try {
      safeSetState(setLoading, true)
      safeSetState(setError, null)

      try {
        console.log("Récupération des données de transport hardware...")
        // Utiliser la nouvelle route
        const hardwareResponse = await API.get("/shipping-hardware/list")
        console.log("Données hardware reçues:", hardwareResponse.data)
        safeSetState(setHardwareShippingData, hardwareResponse.data || [])
      } catch (err) {
        console.error("Erreur lors du chargement des données de transport hardware:", err)
        safeSetState(setHardwareShippingData, [])
      }

      try {
        console.log("Récupération des données de transport produits...")
        const productResponse = await API.get("/product-shipping/")
        console.log("Données produits reçues:", productResponse.data)
        safeSetState(setProductShippingData, productResponse.data || [])
      } catch (err) {
        console.error("Erreur lors du chargement des données de transport produits:", err)
        safeSetState(setProductShippingData, [])
      }
    } catch (err) {
      console.error("Erreur lors du chargement des données de transport:", err)
      if (isMounted.current) {
        safeSetState(setError, "Impossible de charger les données de transport")
      }
    } finally {
      if (isMounted.current) {
        safeSetState(setLoading, false)
      }
    }
  }, [safeSetState])

  const fetchCountries = useCallback(async () => {
    try {
      const response = await API.get("/shipping/countries")
      if (isMounted.current) {
        safeSetState(setCountries, response.data || [])
      }
    } catch (err) {
      console.error("Erreur lors du chargement des pays:", err)
      if (isMounted.current) {
        safeSetState(setCountries, ["France", "Maroc", "États-Unis", "Allemagne", "Espagne", "Italie"])
      }
    }
  }, [safeSetState])

  useEffect(() => {
    fetchShippingData()
    fetchCountries()
    return () => {
      isMounted.current = false
    }
  }, [fetchShippingData, fetchCountries])

  const handleDelete = useCallback(
    async (id, type) => {
      if (!isMounted.current) return

      if (window.confirm("Êtes-vous sûr de vouloir supprimer ces informations de transport ?")) {
        try {
          if (type === "hardware") {
            // Utiliser la nouvelle route
            await API.delete(`/shipping-hardware/delete/${id}`)
            safeSetState(setHardwareShippingData, (prevData) => prevData.filter((item) => item.id !== id))
          } else if (type === "product") {
            await API.delete(`/product-shipping/${id}`)
            safeSetState(setProductShippingData, (prevData) => prevData.filter((item) => item.id !== id))
          }
        } catch (err) {
          console.error("Erreur lors de la suppression:", err)
          if (isMounted.current) {
            safeSetState(setError, "Erreur lors de la suppression des informations de transport")
          }
        }
      }
    },
    [safeSetState],
  )

  const formatCurrency = useCallback((value) => {
    if (!value && value !== 0) return "N/A"
    return value.toLocaleString("fr-FR") + " MAD"
  }, [])

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (e) {
      console.error("Erreur de formatage de date:", e)
      return "Date invalide"
    }
  }, [])

  const filteredHardwareData = hardwareShippingData.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      (item.eq_reference && item.eq_reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.pn && item.pn.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCountry = !filterCountry || item.destination_country === filterCountry
    const matchesDirection = !filterDirection || item.direction === filterDirection

    return matchesSearch && matchesCountry && matchesDirection
  })

  const filteredProductData = productShippingData.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      (item.eq_reference && item.eq_reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.pn && item.pn.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCountry = !filterCountry || item.destination_country === filterCountry
    const matchesDirection = !filterDirection || item.direction === filterDirection

    return matchesSearch && matchesCountry && matchesDirection
  })

  if (loading) {
    return (
      <div className="shipping-loading">
        <div className="shipping-spinner"></div>
        <p>Chargement des données de transport...</p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="shipping-container">
        <div className="shipping-header">
          <div>
            <h1>
              <i className="fas fa-truck-loading me-3"></i>
              Frais de transport
            </h1>
            <p>Gérez les frais de transport pour vos équipements et produits</p>
          </div>
          <div className="shipping-header-actions">
            <Link to="/dashboard/shipping/calculate" className="shipping-btn shipping-btn-primary">
              <i className="fas fa-calculator me-2"></i>
              Nouveau calcul
            </Link>
          </div>
        </div>

        <div className="shipping-tabs">
          <button
            className={`shipping-tab ${activeTab === "hardware" ? "active" : ""}`}
            onClick={() => setActiveTab("hardware")}
          >
            <i className="fas fa-server me-2"></i>
            Équipements IT
            <span className="shipping-tab-count">{hardwareShippingData.length}</span>
          </button>
          <button
            className={`shipping-tab ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            <i className="fas fa-box me-2"></i>
            Produits
            <span className="shipping-tab-count">{productShippingData.length}</span>
          </button>
        </div>

        <div className="shipping-filters">
          <div className="shipping-search">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => safeSetState(setSearchTerm, e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => safeSetState(setSearchTerm, "")}>
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>

          <select
            value={filterCountry}
            onChange={(e) => safeSetState(setFilterCountry, e.target.value)}
            className="shipping-select"
          >
            <option value="">Tous les pays</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>

          <select
            value={filterDirection}
            onChange={(e) => safeSetState(setFilterDirection, e.target.value)}
            className="shipping-select"
          >
            <option value="">Toutes les directions</option>
            <option value="export">Export</option>
            <option value="import">Import</option>
          </select>

          <button className="shipping-btn-icon" onClick={fetchShippingData} title="Rafraîchir">
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>

        {error && (
          <div className="shipping-error">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        <div className="shipping-card">
          <div className="shipping-table-container">
            <table>
              <thead>
                <tr>
                  <th>Équipement</th>
                  <th>Poids (kg)</th>
                  <th>Dimensions</th>
                  <th>Pays</th>
                  <th>Direction</th>
                  <th>Zone</th>
                  <th>Service premium</th>
                  <th>Coût</th>
                  <th>Date de calcul</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === "hardware" ? (
                  filteredHardwareData.length > 0 ? (
                    filteredHardwareData.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link to={`/dashboard/hardware/edit/${item.hardware_id}`} className="shipping-link">
                            <div className="shipping-bold">{item.eq_reference}</div>
                            <div className="shipping-small">PN: {item.pn || "N/A"}</div>
                          </Link>
                        </td>
                        <td>{item.weight_kg} kg</td>
                        <td>{item.dimensions || "N/A"}</td>
                        <td>{item.destination_country}</td>
                        <td>
                          <span
                            className={`shipping-badge ${
                              item.direction === "export" ? "shipping-badge-export" : "shipping-badge-import"
                            }`}
                          >
                            {item.direction === "export" ? "Export" : "Import"}
                          </span>
                        </td>
                        <td>{item.shipping_zone || "N/A"}</td>
                        <td>{item.premium_service ? "Oui" : "Non"}</td>
                        <td className="shipping-cost">{formatCurrency(item.shipping_cost)}</td>
                        <td>{formatDate(item.calculated_at)}</td>
                        <td>
                          <div className="shipping-actions">
                            <Link
                              to={`/dashboard/hardware/shipping/calculate/${item.hardware_id}`}
                              className="shipping-btn-action shipping-edit"
                              title="Recalculer"
                            >
                              <i className="fas fa-calculator"></i>
                            </Link>
                            <button
                              className="shipping-btn-action shipping-delete"
                              onClick={() => handleDelete(item.id, "hardware")}
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
                      <td colSpan="10" className="shipping-empty">
                        <div>
                          <i className="fas fa-search"></i>
                          <h3>Aucune information de transport trouvée</h3>
                          <p>
                            {searchTerm || filterCountry || filterDirection
                              ? "Aucune information ne correspond à vos critères de recherche."
                              : "Aucune information de transport n'a été enregistrée pour les équipements."}
                          </p>
                          {searchTerm || filterCountry || filterDirection ? (
                            <button
                              className="shipping-btn shipping-btn-secondary"
                              onClick={() => {
                                safeSetState(setSearchTerm, "")
                                safeSetState(setFilterCountry, "")
                                safeSetState(setFilterDirection, "")
                              }}
                            >
                              Effacer les filtres
                            </button>
                          ) : (
                            <Link
                              to="/dashboard/hardware/shipping/calculate"
                              className="shipping-btn shipping-btn-primary"
                            >
                              <i className="fas fa-calculator me-2"></i>
                              Calculer vos premiers frais de transport
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ) : filteredProductData.length > 0 ? (
                  filteredProductData.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link to={`/dashboard/products/edit/${item.product_id}`} className="shipping-link">
                          <div className="shipping-bold">{item.eq_reference}</div>
                          <div className="shipping-small">PN: {item.pn || "N/A"}</div>
                        </Link>
                      </td>
                      <td>{item.weight_kg} kg</td>
                      <td>{item.dimensions || "N/A"}</td>
                      <td>{item.destination_country}</td>
                      <td>
                        <span
                          className={`shipping-badge ${
                            item.direction === "export" ? "shipping-badge-export" : "shipping-badge-import"
                          }`}
                        >
                          {item.direction === "export" ? "Export" : "Import"}
                        </span>
                      </td>
                      <td>{item.shipping_zone || "N/A"}</td>
                      <td>{item.premium_service ? "Oui" : "Non"}</td>
                      <td className="shipping-cost">{formatCurrency(item.shipping_cost)}</td>
                      <td>{formatDate(item.calculated_at)}</td>
                      <td>
                        <div className="shipping-actions">
                          <Link
                            to={`/dashboard/product-shipping/calculate/${item.product_id}`}
                            className="shipping-btn-action shipping-edit"
                            title="Recalculer"
                          >
                            <i className="fas fa-calculator"></i>
                          </Link>
                          <button
                            className="shipping-btn-action shipping-delete"
                            onClick={() => handleDelete(item.id, "product")}
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
                    <td colSpan="10" className="shipping-empty">
                      <div>
                        <i className="fas fa-search"></i>
                        <h3>Aucune information de transport trouvée</h3>
                        <p>
                          {searchTerm || filterCountry || filterDirection
                            ? "Aucune information ne correspond à vos critères de recherche."
                            : "Aucune information de transport n'a été enregistrée pour les produits."}
                        </p>
                        {searchTerm || filterCountry || filterDirection ? (
                          <button
                            className="shipping-btn shipping-btn-secondary"
                            onClick={() => {
                              safeSetState(setSearchTerm, "")
                              safeSetState(setFilterCountry, "")
                              safeSetState(setFilterDirection, "")
                            }}
                          >
                            Effacer les filtres
                          </button>
                        ) : (
                          <Link
                            to="/dashboard/product-shipping/calculate"
                            className="shipping-btn shipping-btn-primary"
                          >
                            <i className="fas fa-calculator me-2"></i>
                            Calculer vos premiers frais de transport
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

        <div className="shipping-footer">
          <div className="shipping-stats">
            <span>
              Total:{" "}
              <strong>{activeTab === "hardware" ? hardwareShippingData.length : productShippingData.length}</strong>
            </span>
            <span>
              Affichés:{" "}
              <strong>{activeTab === "hardware" ? filteredHardwareData.length : filteredProductData.length}</strong>
            </span>
            <span>
              Coût moyen:{" "}
              <strong>
                {activeTab === "hardware"
                  ? filteredHardwareData.length > 0
                    ? formatCurrency(
                        filteredHardwareData.reduce((sum, item) => sum + (item.shipping_cost || 0), 0) /
                          filteredHardwareData.length,
                      )
                    : "N/A"
                  : filteredProductData.length > 0
                    ? formatCurrency(
                        filteredProductData.reduce((sum, item) => sum + (item.shipping_cost || 0), 0) /
                          filteredProductData.length,
                      )
                    : "N/A"}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default ShippingDashboard
