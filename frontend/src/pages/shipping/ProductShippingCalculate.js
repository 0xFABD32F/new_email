"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../../services/api"
import ProductShippingCalculator from "../../components/ProductShippingCalculator"
import "./ShippingStyles.css"

function ProductShippingCalculate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMounted = useRef(true)

  const [product, setProduct] = useState(null)
  const [shippingInfo, setShippingInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    const fetchData = async () => {
      try {
        safeSetState(setLoading, true)

        // Charger les informations du produit
        const productResponse = await API.get(`/products/${id}`)
        safeSetState(setProduct, productResponse.data)

        // Essayer de charger les informations de transport existantes
        try {
          const shippingResponse = await API.get(`/product-shipping/${id}`)
          safeSetState(setShippingInfo, shippingResponse.data)
        } catch (err) {
          // Pas d'informations de transport, ce n'est pas une erreur
          console.log("Pas d'informations de transport pour ce produit")
        }

        safeSetState(setError, null)
      } catch (err) {
        console.error("Erreur de chargement:", err)
        safeSetState(setError, "Impossible de charger les données du produit")
      } finally {
        safeSetState(setLoading, false)
      }
    }

    if (id) {
      fetchData()
    } else {
      safeSetState(setLoading, false)
    }
  }, [id, safeSetState])

  const handleCalculated = useCallback(
    (result) => {
      safeSetState(setShippingInfo, result)
    },
    [safeSetState],
  )

  if (loading) {
    return (
      <div className="shipping-loading">
        <div className="shipping-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="shipping-error-page">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Une erreur est survenue</h3>
        <p>{error}</p>
        <button onClick={() => navigate("/dashboard/products")} className="shipping-btn shipping-btn-primary">
          <i className="fas fa-arrow-left me-2"></i>Retour aux produits
        </button>
      </div>
    )
  }

  if (!product && id) {
    return (
      <div className="shipping-error-page">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Produit non trouvé</h3>
        <p>Le produit demandé n'existe pas ou a été supprimé.</p>
        <button onClick={() => navigate("/dashboard/products")} className="shipping-btn shipping-btn-primary">
          <i className="fas fa-arrow-left me-2"></i>Retour aux produits
        </button>
      </div>
    )
  }

  return (
    <div className="shipping-container">
      <div className="shipping-header">
        <div>
          <h1>
            <i className="fas fa-truck-loading me-3"></i>
            {id ? "Calculer les frais de transport pour un produit" : "Calculateur de frais de transport"}
          </h1>
          <p>
            {id
              ? `Calculez les frais de transport DHL pour ${product?.brand} ${product?.pn}`
              : "Calculez les frais de transport DHL pour n'importe quelle expédition"}
          </p>
        </div>
        <button
          className="shipping-btn shipping-btn-secondary"
          onClick={() => navigate(id ? "/dashboard/products" : "/dashboard/shipping")}
        >
          <i className="fas fa-arrow-left me-2"></i>
          {id ? "Retour aux produits" : "Retour au tableau de bord"}
        </button>
      </div>

      {product && (
        <div className="shipping-product-info">
          <div className="shipping-product-details">
            <div className="shipping-product-header">
              <h3>{product.brand}</h3>
              <span className="shipping-product-pn">{product.pn}</span>
            </div>
            <p className="shipping-product-description">{product.eq_reference}</p>
            <div className="shipping-product-meta">
              <div className="shipping-product-meta-item">
                <i className="fas fa-weight"></i>
                <span>Poids: {product.poids_kg ? `${product.poids_kg} kg` : "Non défini"}</span>
              </div>
              <div className="shipping-product-meta-item">
                <i className="fas fa-ruler-combined"></i>
                <span>Dimensions: {product.dimensions || "Non définies"}</span>
              </div>
              <div className="shipping-product-meta-item">
                <i className="fas fa-globe"></i>
                <span>Pays: {product.country || "Non défini"}</span>
              </div>
            </div>
          </div>

          {shippingInfo && (
            <div className="shipping-info-summary">
              <h4>Informations de transport enregistrées</h4>
              <div className="shipping-info-details">
                <div className="shipping-info-item">
                  <span>Coût:</span>
                  <strong>{shippingInfo.shipping_cost?.toFixed(2)} MAD</strong>
                </div>
                <div className="shipping-info-item">
                  <span>Pays:</span>
                  <strong>{shippingInfo.destination_country}</strong>
                </div>
                <div className="shipping-info-item">
                  <span>Direction:</span>
                  <strong>{shippingInfo.direction === "export" ? "Export" : "Import"}</strong>
                </div>
                <div className="shipping-info-item">
                  <span>Calculé le:</span>
                  <strong>
                    {new Date(shippingInfo.calculated_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="shipping-card">
        <ProductShippingCalculator
          productId={id ? Number.parseInt(id) : null}
          initialWeight={product?.poids_kg || 1}
          initialCountry={product?.country || "France"}
          initialDimensions={product?.dimensions || ""}
          showMultiLeg={true}
          type={id ? "product" : "standalone"}
          onCalculate={handleCalculated}
        />
      </div>

      <div className="shipping-footer">
        <div className="shipping-note">
          <i className="fas fa-info-circle me-2"></i>
          <p>
            Les frais de transport sont calculés en fonction des tarifs DHL et peuvent varier. Les calculs sont basés
            sur le poids, les dimensions et la destination.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProductShippingCalculate
