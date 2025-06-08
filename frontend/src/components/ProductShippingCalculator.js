"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import API from "../services/api"
import "./ShippingStyles.css"

const ProductShippingCalculator = ({
  initialWeight = 1,
  initialCountry = "France",
  initialDimensions = "",
  onCalculate = null,
  showMultiLeg = false,
  productId = null,
  type = "standalone",
}) => {
  // Utiliser useRef pour suivre si le composant est monté
  const isMounted = useRef(true)

  const [weight, setWeight] = useState(initialWeight)
  const [country, setCountry] = useState(initialCountry)
  const [dimensions, setDimensions] = useState(initialDimensions)
  const [direction, setDirection] = useState("export")
  const [premiumService, setPremiumService] = useState("")
  const [isMultiLeg, setIsMultiLeg] = useState(false)
  const [legs, setLegs] = useState([{ origin: "MA", destination: "", direction: "export" }])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [countries, setCountries] = useState([])
  const [countryCodes, setCountryCodes] = useState({})
  const [premiumServices, setPremiumServices] = useState({})

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

  // Charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countriesResponse, countryCodesResponse, premiumServicesResponse] = await Promise.allSettled([
          API.get("/shipping/countries"),
          API.get("/shipping/country-codes"),
          API.get("/shipping/premium-services"),
        ])

        // Vérifier si le composant est toujours monté avant de mettre à jour l'état
        if (isMounted.current) {
          if (countriesResponse.status === "fulfilled") {
            safeSetState(setCountries, countriesResponse.value.data || [])
          } else {
            safeSetState(setCountries, [])
          }

          if (countryCodesResponse.status === "fulfilled") {
            safeSetState(setCountryCodes, countryCodesResponse.value.data || {})
          } else {
            safeSetState(setCountryCodes, {})
          }

          if (premiumServicesResponse.status === "fulfilled") {
            safeSetState(setPremiumServices, premiumServicesResponse.value.data?.premium_services || {})
          } else {
            safeSetState(setPremiumServices, {})
          }
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err)
        if (isMounted.current) {
          safeSetState(setError, "Impossible de charger les données nécessaires au calcul.")
        }
      }
    }

    fetchData()
  }, [safeSetState])

  // Mettre à jour le premier leg si on change de mode
  useEffect(() => {
    if (isMultiLeg && isMounted.current) {
      safeSetState(setLegs, [{ origin: "MA", destination: country, direction: "export" }])
    }
  }, [isMultiLeg, country, safeSetState])

  const handleWeightChange = useCallback(
    (e) => {
      const value = Number.parseFloat(e.target.value)
      safeSetState(setWeight, value > 0 ? value : 1)
    },
    [safeSetState],
  )

  const handleCountryChange = useCallback(
    (e) => {
      safeSetState(setCountry, e.target.value)
    },
    [safeSetState],
  )

  const handleDimensionsChange = useCallback(
    (e) => {
      safeSetState(setDimensions, e.target.value)
    },
    [safeSetState],
  )

  const handleDirectionChange = useCallback(
    (e) => {
      safeSetState(setDirection, e.target.value)
    },
    [safeSetState],
  )

  const handlePremiumServiceChange = useCallback(
    (e) => {
      safeSetState(setPremiumService, e.target.value)
    },
    [safeSetState],
  )

  const handleLegChange = useCallback(
    (index, field, value) => {
      safeSetState(setLegs, (prevLegs) => {
        const updatedLegs = [...prevLegs]
        updatedLegs[index][field] = value
        return updatedLegs
      })
    },
    [safeSetState],
  )

  const addLeg = useCallback(() => {
    safeSetState(setLegs, (prevLegs) => {
      const lastLeg = prevLegs[prevLegs.length - 1]
      return [...prevLegs, { origin: lastLeg.destination, destination: "", direction: "export" }]
    })
  }, [safeSetState])

  const removeLeg = useCallback(
    (index) => {
      safeSetState(setLegs, (prevLegs) => {
        if (prevLegs.length > 1) {
          const updatedLegs = [...prevLegs]
          updatedLegs.splice(index, 1)
          return updatedLegs
        }
        return prevLegs
      })
    },
    [safeSetState],
  )

  const calculateShipping = useCallback(async () => {
    if (!isMounted.current) return

    safeSetState(setLoading, true)
    safeSetState(setError, null)

    try {
      let response

      if (isMultiLeg) {
        // Construire la chaîne de legs pour l'API
        const legString = legs.map((leg) => `${leg.origin}:${leg.destination}`).join(",")

        // Utiliser POST pour calculate-multi-leg
        response = await API.post("/shipping/calculate-multi-leg", null, {
          params: {
            weight_kg: weight,
            legs: legString,
            dimensions: dimensions || undefined,
            premium_service: premiumService || undefined,
          },
        })
      } else {
        response = await API.get("/shipping/calculate", {
          params: {
            weight_kg: weight,
            country: country,
            direction: direction,
            dimensions: dimensions || undefined,
            premium_service: premiumService || undefined,
          },
        })
      }

      // S'assurer que la réponse contient des données valides et que le composant est toujours monté
      if (response && response.data && isMounted.current) {
        safeSetState(setResult, response.data)

        // Notifier le composant parent du résultat calculé
        if (onCalculate && isMounted.current) {
          onCalculate(response.data)
        }
      }
    } catch (err) {
      console.error("Erreur lors du calcul des frais de transport:", err)
      if (isMounted.current) {
        safeSetState(setError, "Une erreur est survenue lors du calcul des frais de transport.")
      }
    } finally {
      if (isMounted.current) {
        safeSetState(setLoading, false)
      }
    }
  }, [country, direction, dimensions, isMultiLeg, legs, onCalculate, premiumService, safeSetState, weight])

  const saveShippingInfo = useCallback(async () => {
    if (!result || !isMounted.current) {
      if (isMounted.current) {
        safeSetState(setError, "Veuillez d'abord calculer les frais de transport.")
      }
      return
    }

    safeSetState(setLoading, true)
    safeSetState(setError, null)

    try {
      let response

      if (isMultiLeg) {
        // Pour les calculs multi-leg
        const legString = legs.map((leg) => `${leg.origin}:${leg.destination}`).join(",")

        if (type === "product" && productId) {
          // Enregistrer pour un produit spécifique avec multi-leg
          console.log("Envoi des données multi-leg pour produit:", productId)
          const shippingData = {
            weight_kg: weight,
            legs: legString,
            dimensions: dimensions || undefined,
            premium_service: premiumService || undefined,
          }
          console.log("Données envoyées:", shippingData)
          response = await API.post(`/product-shipping/${productId}/shipping-multi-leg`, shippingData)
          console.log("Réponse multi-leg:", response.data)
        } else if (type === "hardware" && productId) {
          // Enregistrer pour un hardware spécifique avec multi-leg
          const shippingData = {
            weight_kg: weight,
            legs: legString,
            dimensions: dimensions || undefined,
            premium_service: premiumService || undefined,
          }
          console.log("Données envoyées pour hardware multi-leg:", shippingData)
          response = await API.post(`/hardware/${productId}/shipping-multi-leg`, shippingData)
          console.log("Réponse hardware multi-leg:", response.data)
        } else {
          // Enregistrer comme calcul autonome
          const shippingData = {
            weight_kg: weight,
            legs: legString,
            dimensions: dimensions || undefined,
            premium_service: premiumService || undefined,
          }
          response = await API.post("/shipping/standalone-multi-leg", shippingData)
        }
      } else {
        // Pour les calculs standard
        const shippingData = {
          weight_kg: weight,
          dimensions: dimensions || undefined,
          destination_country: country,
          direction: direction,
          premium_service: premiumService || undefined,
        }

        if (type === "product" && productId) {
          // Enregistrer pour un produit spécifique
          console.log("Envoi des données standard pour produit:", productId, shippingData)
          response = await API.post(`/product-shipping/${productId}/shipping`, shippingData)
          console.log("Réponse standard:", response.data)
        } else if (type === "hardware" && productId) {
          // Enregistrer pour un hardware spécifique
          console.log("Envoi des données standard pour hardware:", productId, shippingData)
          response = await API.post(`/hardware/${productId}/shipping`, shippingData)
          console.log("Réponse hardware standard:", response.data)
        } else {
          // Enregistrer comme calcul autonome
          response = await API.post("/shipping/standalone", shippingData)
        }
      }

      if (isMounted.current) {
        // Notifier le composant parent que les informations ont été enregistrées
        if (onCalculate) {
          onCalculate({
            ...result,
            id: response.data.id,
            saved: true,
          })
        }

        safeSetState(setResult, {
          ...result,
          id: response.data.id,
          saved: true,
        })

        // Afficher un message de succès
        alert("Les frais de transport ont été enregistrés avec succès!")
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement des informations de transport:", err)
      if (isMounted.current) {
        safeSetState(
          setError,
          `Une erreur est survenue lors de l'enregistrement des informations de transport: ${err.message}`,
        )
      }
    } finally {
      if (isMounted.current) {
        safeSetState(setLoading, false)
      }
    }
  }, [
    country,
    direction,
    dimensions,
    isMultiLeg,
    legs,
    onCalculate,
    premiumService,
    productId,
    result,
    safeSetState,
    type,
    weight,
  ])

  return (
    <div className="shipping-calculator">
      <h3>
        <i className="fas fa-truck"></i> Calculateur de frais de transport DHL
      </h3>

      <div className="shipping-form">
        <div className="form-group">
          <label htmlFor="weight">Poids (kg)</label>
          <input type="number" id="weight" value={weight} onChange={handleWeightChange} min="0.1" step="0.1" />
        </div>

        <div className="form-group">
          <label htmlFor="dimensions">Dimensions (LxlxH cm)</label>
          <input
            type="text"
            id="dimensions"
            value={dimensions}
            onChange={handleDimensionsChange}
            placeholder="Ex: 30x20x15"
          />
          <small className="form-text text-muted">Format: Longueur x largeur x hauteur en centimètres</small>
        </div>

        {showMultiLeg && (
          <div className="shipping-type-toggle">
            <label>
              <input type="checkbox" checked={isMultiLeg} onChange={() => safeSetState(setIsMultiLeg, !isMultiLeg)} />
              Transport multi-étapes
            </label>
          </div>
        )}

        {!isMultiLeg ? (
          <>
            <div className="form-group">
              <label htmlFor="country">Pays de destination</label>
              <select id="country" value={country} onChange={handleCountryChange}>
                <option value="">Sélectionner un pays</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="direction">Direction</label>
              <select id="direction" value={direction} onChange={handleDirectionChange}>
                <option value="export">Export</option>
                <option value="import">Import</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="premiumService">Service premium</label>
              <select id="premiumService" value={premiumService} onChange={handlePremiumServiceChange}>
                <option value="">Aucun</option>
                {Object.entries(premiumServices).map(([service, price]) => (
                  <option key={service} value={service}>
                    {service} (+{price} MAD)
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="multi-leg-container">
            <h4>Étapes du transport</h4>

            {legs.map((leg, index) => (
              <div key={`${leg.origin || "empty"}-${leg.destination || "empty"}-${index}`} className="leg-row">
                <div className="leg-number">{index + 1}</div>

                <div className="leg-fields">
                  <div className="form-group">
                    <label>Origine</label>
                    <select value={leg.origin} onChange={(e) => handleLegChange(index, "origin", e.target.value)}>
                      <option value="">Sélectionner un pays</option>
                      {Object.entries(countryCodes).map(([code, name]) => (
                        <option key={code} value={code}>
                          {name} ({code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="leg-arrow">→</div>

                  <div className="form-group">
                    <label>Destination</label>
                    <select
                      value={leg.destination}
                      onChange={(e) => handleLegChange(index, "destination", e.target.value)}
                    >
                      <option value="">Sélectionner un pays</option>
                      {Object.entries(countryCodes).map(([code, name]) => (
                        <option key={code} value={code}>
                          {name} ({code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Direction</label>
                    <select value={leg.direction} onChange={(e) => handleLegChange(index, "direction", e.target.value)}>
                      <option value="export">Export</option>
                      <option value="import">Import</option>
                    </select>
                  </div>
                </div>

                {legs.length > 1 && (
                  <button type="button" className="remove-leg-btn" onClick={() => removeLeg(index)}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            ))}

            <button type="button" className="add-leg-btn" onClick={addLeg}>
              <i className="fas fa-plus"></i> Ajouter une étape
            </button>
          </div>
        )}

        <button
          type="button"
          className="calculate-btn"
          onClick={calculateShipping}
          disabled={
            loading || (!isMultiLeg && !country) || (isMultiLeg && legs.some((leg) => !leg.origin || !leg.destination))
          }
        >
          {loading ? (
            <>
              <div className="spinner-sm"></div> Calcul en cours...
            </>
          ) : (
            <>
              <i className="fas fa-calculator"></i> Calculer les frais
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="shipping-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {result && (
        <div className="shipping-result">
          <h4>Résultat du calcul</h4>

          {isMultiLeg ? (
            <>
              <div className="result-total">
                <span>Coût total:</span>
                <span className="result-price">
                  {result.total_cost?.toFixed(2)} {result.currency}
                </span>
              </div>

              <div className="result-legs">
                <h5>Détail par étape:</h5>

                {result.legs?.map((leg, index) => (
                  <div key={`${leg.leg || ""}-${leg.from || ""}-${leg.to || ""}-${index}`} className="result-leg">
                    <div className="leg-route">
                      <span className="leg-number">{leg.leg}</span>
                      <span className="leg-from">{leg.from}</span>
                      <span className="leg-arrow">→</span>
                      <span className="leg-to">{leg.to}</span>
                    </div>

                    <div className="leg-details">
                      <div className="leg-direction">{leg.direction === "export" ? "Export" : "Import"}</div>
                      <div className="leg-zone">Zone {leg.zone}</div>
                      <div className="leg-price">
                        {leg.cost?.toFixed(2)} {leg.currency}
                      </div>
                    </div>

                    {leg.error && (
                      <div className="leg-error">
                        <i className="fas fa-exclamation-triangle"></i> {leg.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="result-total">
                <span>Coût total:</span>
                <span className="result-price">
                  {result.shipping_cost?.toFixed(2)} {result.currency}
                </span>
              </div>

              <div className="result-details">
                <div className="result-detail">
                  <span>Pays:</span>
                  <span>{result.country}</span>
                </div>

                <div className="result-detail">
                  <span>Zone:</span>
                  <span>{result.zone}</span>
                </div>

                <div className="result-detail">
                  <span>Direction:</span>
                  <span>{result.direction === "export" ? "Export" : "Import"}</span>
                </div>

                <div className="result-detail">
                  <span>Poids effectif:</span>
                  <span>{result.effective_weight_kg} kg</span>
                </div>

                {result.premium_service && (
                  <div className="result-detail">
                    <span>Service premium:</span>
                    <span>{result.premium_service}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {!result.saved && (
            <button type="button" className="save-btn" onClick={saveShippingInfo} disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner-sm"></div> Enregistrement...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i> Enregistrer ce calcul
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ProductShippingCalculator
