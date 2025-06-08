"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../services/api"
import "./ShippingStyles.css"

function ShippingCalculator() {
  // Récupérer le paramètre hardwareId de l'URL
  const { hardwareId } = useParams()
  const navigate = useNavigate()

  console.log("ShippingCalculator - hardwareId:", hardwareId) // Ajout pour débogage

  const [hardware, setHardware] = useState(null)
  const [shippingInfo, setShippingInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [countries, setCountries] = useState([])
  const [countryCodes, setCountryCodes] = useState({})
  const [premiumServices, setPremiumServices] = useState([])

  // État pour le formulaire
  const [weight, setWeight] = useState("")
  const [dimensions, setDimensions] = useState("")
  const [destinationCountry, setDestinationCountry] = useState("")
  const [direction, setDirection] = useState("export")
  const [premiumService, setPremiumService] = useState(false)
  const [calculatedCost, setCalculatedCost] = useState(null)
  const [calculationLoading, setCalculationLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // État pour le transport multi-étapes
  const [isMultiLeg, setIsMultiLeg] = useState(false)
  const [legs, setLegs] = useState([{ origin: "", destination: "", direction: "export" }])
  const [multiLegResult, setMultiLegResult] = useState(null)

  // Charger les données de l'équipement et les informations de transport
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Récupérer les données de l'équipement
        if (hardwareId) {
          console.log(`Récupération des données pour l'équipement ${hardwareId}`)
          const hardwareResponse = await API.get(`/hardware/${hardwareId}`)
          setHardware(hardwareResponse.data)

          // Récupérer les informations de transport existantes
          try {
            // Utiliser la nouvelle route
            const shippingResponse = await API.get(`/shipping-hardware/item/${hardwareId}`)
            if (shippingResponse.data && shippingResponse.data.exists) {
              setShippingInfo(shippingResponse.data)
              setWeight(shippingResponse.data.weight_kg)
              setDimensions(shippingResponse.data.dimensions || "")
              setDestinationCountry(shippingResponse.data.destination_country)
              setDirection(shippingResponse.data.direction)
              setPremiumService(shippingResponse.data.premium_service)
            } else {
              console.log("Pas d'informations de transport pour cet équipement")
              // Initialiser avec les données de l'équipement
              setWeight(hardwareResponse.data.poids_kg || "")
              setDimensions(hardwareResponse.data.dimensions || "")
            }
          } catch (err) {
            console.log("Pas d'informations de transport pour cet équipement")
            // Initialiser avec les données de l'équipement
            setWeight(hardwareResponse.data.poids_kg || "")
            setDimensions(hardwareResponse.data.dimensions || "")
          }
        } else {
          console.log("Pas d'ID d'équipement fourni, mode création")
        }

        // Récupérer la liste des pays
        const countriesResponse = await API.get("/shipping/countries")
        setCountries(countriesResponse.data)

        // Récupérer les codes de pays
        const countryCodesResponse = await API.get("/shipping/country-codes")
        setCountryCodes(countryCodesResponse.data)

        // Récupérer les services premium
        const premiumServicesResponse = await API.get("/shipping/premium-services")
        setPremiumServices(premiumServicesResponse.data)
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err)
        setError("Impossible de charger les données de l'équipement")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [hardwareId])

  // Calculer les frais de transport
  const calculateShipping = useCallback(async () => {
    if (!weight || !destinationCountry) {
      setError("Veuillez remplir tous les champs obligatoires")
      return
    }
  
    try {
      setCalculationLoading(true)
      setError(null)
  
      // Construire les paramètres query string
      const params = new URLSearchParams({
        weight_kg: weight,
        country: destinationCountry,
        direction,
        premium_service: premiumService ? "true" : "",
        dimensions,
      })
  
      // Faire un GET avec les params dans l’URL
      const response = await API.get(`/shipping/calculate?${params.toString()}`)
  
      setCalculatedCost(response.data)
    } catch (err) {
      console.error("Erreur lors du calcul:", err)
      setError("Erreur lors du calcul des frais de transport")
    } finally {
      setCalculationLoading(false)
    }
  }, [weight, destinationCountry, direction, premiumService, dimensions])
  

  // Calculer les frais de transport multi-étapes
  const calculateMultiLegShipping = useCallback(async () => {
    if (!weight || legs.some((leg) => !leg.origin || !leg.destination)) {
      setError("Veuillez remplir tous les champs obligatoires pour chaque étape")
      return
    }

    try {
      setCalculationLoading(true)
      setError(null)

      // Formater les étapes pour l'API
      const legsParam = legs.map((leg) => `${leg.origin}:${leg.destination}`).join(",")

      const response = await API.post(`/shipping/calculate-multi-leg?weight_kg=${weight}&legs=${legsParam}`, {
        weight_kg: Number.parseFloat(weight),
        legs: legs,
        dimensions,
        premium_service: premiumService,
      })

      setMultiLegResult(response.data)
    } catch (err) {
      console.error("Erreur lors du calcul multi-étapes:", err)
      setError("Erreur lors du calcul des frais de transport multi-étapes")
    } finally {
      setCalculationLoading(false)
    }
  }, [weight, legs, dimensions, premiumService])

  // Enregistrer les informations de transport
  const handleSave = useCallback(async () => {
    if (!calculatedCost) {
      alert("Veuillez d'abord calculer les frais de transport.")
      return
    }

    try {
      setSaveSuccess(true)

      const shippingData = {
        weight_kg: Number.parseFloat(weight),
        dimensions: dimensions || null,
        destination_country: destinationCountry || null,
        direction: direction,
        premium_service: premiumService || null,
      }

      console.log("Envoi des données pour enregistrement:", shippingData)

      // Utiliser directement la bonne route au lieu de compter sur la redirection
      const response = await API.post(`/shipping-hardware/create/${hardwareId}`, shippingData)
      console.log("Réponse du serveur:", response.data)

      alert("Les frais de transport ont été enregistrés avec succès!")
      navigate("/dashboard/shipping")
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err)
      setError(`Une erreur est survenue lors de l'enregistrement: ${err.response?.data?.detail || err.message}`)
    } finally {
      setSaveSuccess(false)
    }
  }, [calculatedCost, weight, dimensions, destinationCountry, direction, premiumService, hardwareId, navigate])

  // Enregistrer les informations de transport multi-étapes
  const saveMultiLegShipping = useCallback(
    async (multiLegData) => {
      if (!multiLegData) {
        alert("Veuillez d'abord calculer les frais de transport multi-étapes.")
        return
      }

      try {
        setSaveSuccess(true)

        // Utiliser directement la bonne route au lieu de compter sur la redirection
        const response = await API.post(`/shipping-hardware/multi-leg/${hardwareId}`, multiLegData)
        console.log("Réponse du serveur (multi-leg):", response.data)

        alert("Les frais de transport multi-étapes ont été enregistrés avec succès!")
        navigate("/dashboard/shipping")
      } catch (err) {
        console.error("Erreur lors de l'enregistrement multi-étapes:", err)
        setError(
          `Une erreur est survenue lors de l'enregistrement multi-étapes: ${err.response?.data?.detail || err.message}`,
        )
      } finally {
        setSaveSuccess(false)
      }
    },
    [hardwareId, navigate],
  )

  // Ajouter une étape
  const addLeg = useCallback(() => {
    setLegs((prevLegs) => [...prevLegs, { origin: "", destination: "", direction: "export" }])
  }, [])

  // Supprimer une étape
  const removeLeg = useCallback((index) => {
    setLegs((prevLegs) => prevLegs.filter((_, i) => i !== index))
  }, [])

  // Mettre à jour une étape
  const updateLeg = useCallback((index, field, value) => {
    setLegs((prevLegs) => {
      const newLegs = [...prevLegs]
      newLegs[index] = { ...newLegs[index], [field]: value }
      return newLegs
    })
  }, [])

  if (loading) {
    return (
      <div className="shipping-loading">
        <div className="shipping-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  if (hardwareId && !hardware) {
    return (
      <div className="shipping-error">
        <i className="fas fa-exclamation-triangle me-2"></i>
        <h3>Équipement non trouvé</h3>
        <p>L'équipement demandé n'existe pas ou a été supprimé.</p>
        <button className="shipping-btn shipping-btn-primary" onClick={() => navigate("/dashboard/hardware")}>
          Retour à la liste des équipements
        </button>
      </div>
    )
  }

  return (
    <div className="shipping-container">
      <div className="shipping-header">
        <div>
          <h1>
            <i className="fas fa-calculator me-3"></i>
            Calculer les frais de transport pour un équipement
          </h1>
          <p>Calculez les frais de transport pour {hardware ? hardware.eq_reference : "un nouvel équipement"}</p>
        </div>
        <div className="shipping-header-actions">
          <button className="shipping-btn shipping-btn-secondary" onClick={() => navigate("/dashboard/shipping")}>
            <i className="fas fa-arrow-left me-2"></i>
            Retour
          </button>
        </div>
      </div>

      {error && (
        <div className="shipping-error">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="shipping-success">
          <i className="fas fa-check-circle me-2"></i>
          Informations de transport enregistrées avec succès. Redirection en cours...
        </div>
      )}

      {hardware && (
        <div className="shipping-card">
          <h2>Informations de l'équipement</h2>
          <div className="shipping-info-grid">
            <div>
              <label>Référence:</label>
              <p>{hardware.eq_reference}</p>
            </div>
            <div>
              <label>Marque:</label>
              <p>{hardware.brand}</p>
            </div>
            <div>
              <label>PN:</label>
              <p>{hardware.pn}</p>
            </div>
            <div>
              <label>Poids:</label>
              <p>{hardware.poids_kg ? `${hardware.poids_kg} kg` : "Non spécifié"}</p>
            </div>
            <div>
              <label>Dimensions:</label>
              <p>{hardware.dimensions || "Non spécifiées"}</p>
            </div>
            <div>
              <label>Pays:</label>
              <p>{hardware.country || "Non spécifié"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="shipping-card">
        <h2>Calculateur de frais de transport DHL</h2>

        <div className="shipping-form-toggle">
          <button className={`shipping-tab ${!isMultiLeg ? "active" : ""}`} onClick={() => setIsMultiLeg(false)}>
            <i className="fas fa-truck me-2"></i>
            Transport simple
          </button>
          <button className={`shipping-tab ${isMultiLeg ? "active" : ""}`} onClick={() => setIsMultiLeg(true)}>
            <i className="fas fa-route me-2"></i>
            Transport multi-étapes
          </button>
        </div>

        <div className="shipping-form">
          <div className="shipping-form-group">
            <label>
              Poids (kg) <span className="shipping-required">*</span>
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min="0.1"
              step="0.1"
              required
            />
          </div>

          <div className="shipping-form-group">
            <label>Dimensions (LxlxH cm)</label>
            <input
              type="text"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              placeholder="Ex: 30x20x15"
            />
            <small>Format: Longueur x largeur x hauteur en centimètres</small>
          </div>

          {!isMultiLeg ? (
            // Formulaire pour transport simple
            <>
              <div className="shipping-form-group">
                <label>
                  Pays de destination <span className="shipping-required">*</span>
                </label>
                <select value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} required>
                  <option value="">Sélectionnez un pays</option>
                  {Array.isArray(countries) ? (
                    countries.map((country) => (
                      <option
                        key={typeof country === "object" ? country.code : country}
                        value={typeof country === "object" ? country.code : country}
                      >
                        {typeof country === "object" ? country.name : country}
                      </option>
                    ))
                  ) : (
                    <option value="">Chargement des pays...</option>
                  )}
                </select>
              </div>

              <div className="shipping-form-group">
                <label>
                  Direction <span className="shipping-required">*</span>
                </label>
                <select value={direction} onChange={(e) => setDirection(e.target.value)} required>
                  <option value="export">Export</option>
                  <option value="import">Import</option>
                </select>
              </div>

              <div className="shipping-form-group shipping-checkbox">
                <input
                  type="checkbox"
                  id="premium-service"
                  checked={premiumService}
                  onChange={(e) => setPremiumService(e.target.checked)}
                />
                <label htmlFor="premium-service">Service premium</label>
              </div>

              <div className="shipping-form-actions">
                <button
                  className="shipping-btn shipping-btn-primary"
                  onClick={calculateShipping}
                  disabled={calculationLoading}
                >
                  {calculationLoading ? (
                    <>
                      <div className="shipping-spinner-small"></div>
                      Calcul en cours...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-calculator me-2"></i>
                      Calculer les frais
                    </>
                  )}
                </button>
              </div>

              {calculatedCost && (
                <div className="shipping-result">
                  <h3>Résultat du calcul</h3>
                  <div className="shipping-result-grid">
                    <div>
                      <label>Coût:</label>
                      <p className="shipping-cost">{calculatedCost.shipping_cost.toLocaleString("fr-FR")} MAD</p>
                    </div>
                    <div>
                      <label>Zone:</label>
                      <p>{calculatedCost.zone}</p>
                    </div>
                    <div>
                      <label>Poids effectif:</label>
                      <p>{calculatedCost.effective_weight_kg} kg</p>
                    </div>
                    <div>
                      <label>Pays:</label>
                      <p>{calculatedCost.country}</p>
                    </div>
                  </div>

                  <button className="shipping-btn shipping-btn-success" onClick={handleSave}>
                    <i className="fas fa-save me-2"></i>
                    Enregistrer ces informations
                  </button>
                </div>
              )}
            </>
          ) : (
            // Formulaire pour transport multi-étapes
            <>
              <h3>Étapes du transport</h3>

              {legs.map((leg, index) => (
                <div key={index} className="shipping-leg">
                  <div className="shipping-leg-header">
                    <h4>{index + 1}</h4>
                    {legs.length > 1 && (
                      <button
                        className="shipping-btn-icon shipping-delete"
                        onClick={() => removeLeg(index)}
                        title="Supprimer cette étape"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>

                  <div className="shipping-form-group">
                    <label>
                      Origine <span className="shipping-required">*</span>
                    </label>
                    <select value={leg.origin} onChange={(e) => updateLeg(index, "origin", e.target.value)} required>
                      <option value="">Sélectionnez un pays</option>
                      {Object.entries(countryCodes).map(([code, name]) => (
                        <option key={code} value={code}>
                          {name} ({code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="shipping-form-group">
                    <label>
                      Destination <span className="shipping-required">*</span>
                    </label>
                    <select
                      value={leg.destination}
                      onChange={(e) => updateLeg(index, "destination", e.target.value)}
                      required
                    >
                      <option value="">Sélectionnez un pays</option>
                      {Object.entries(countryCodes).map(([code, name]) => (
                        <option key={code} value={code}>
                          {name} ({code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="shipping-form-group">
                    <label>
                      Direction <span className="shipping-required">*</span>
                    </label>
                    <select
                      value={leg.direction}
                      onChange={(e) => updateLeg(index, "direction", e.target.value)}
                      required
                    >
                      <option value="export">Export</option>
                      <option value="import">Import</option>
                    </select>
                  </div>
                </div>
              ))}

              <div className="shipping-form-actions">
                <button className="shipping-btn shipping-btn-secondary" onClick={addLeg}>
                  <i className="fas fa-plus me-2"></i>
                  Ajouter une étape
                </button>

                <button
                  className="shipping-btn shipping-btn-primary"
                  onClick={calculateMultiLegShipping}
                  disabled={calculationLoading}
                >
                  {calculationLoading ? (
                    <>
                      <div className="shipping-spinner-small"></div>
                      Calcul en cours...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-calculator me-2"></i>
                      Calculer les frais
                    </>
                  )}
                </button>
              </div>

              {multiLegResult && (
                <div className="shipping-result">
                  <h3>Résultat du calcul</h3>
                  <div className="shipping-result-total">
                    <label>Coût total:</label>
                    <p className="shipping-cost">{multiLegResult.total_cost.toLocaleString("fr-FR")} MAD</p>
                  </div>

                  <h4>Détail par étape:</h4>
                  <div className="shipping-result-legs">
                    {multiLegResult.legs.map((leg, index) => (
                      <div key={index} className="shipping-result-leg">
                        <div className="shipping-result-leg-header">
                          <h5>
                            {index + 1}
                            {leg.origin}—{leg.destination}
                          </h5>
                          <span className="shipping-badge">{leg.direction === "export" ? "Export" : "Import"}</span>
                        </div>
                        <div className="shipping-result-leg-details">
                          <div>
                            <label>Zone:</label>
                            <p>{leg.zone}</p>
                          </div>
                          <div>
                            <label>Coût:</label>
                            <p>{leg.cost.toLocaleString("fr-FR")} MAD</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="shipping-btn shipping-btn-success"
                    onClick={() => saveMultiLegShipping(multiLegResult)}
                  >
                    <i className="fas fa-save me-2"></i>
                    Enregistrer ces informations
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShippingCalculator
