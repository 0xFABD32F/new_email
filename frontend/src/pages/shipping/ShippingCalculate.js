"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../../services/api"
import ShippingCalculator from "../../components/ShippingCalculator"
import "../../components/ShippingStyles.css"

function ShippingCalculate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMounted = useRef(true)
  const [hardware, setHardware] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [calculationResult, setCalculationResult] = useState(null)
  const [saving, setSaving] = useState(false)

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

  // Utiliser useCallback pour la fonction de chargement
  const fetchData = useCallback(async () => {
    try {
      safeSetState(setLoading, true);
  
      if (id) {
        const response = await API.get(`/hardware/${id}`);
        safeSetState(setHardware, response.data);
  
        // Récupérer les informations de transport
        try {
          const shippingResponse = await API.get(`/hardware/${id}/shipping`);
          if (shippingResponse.data && shippingResponse.data.exists) {
            safeSetState(setCalculationResult, shippingResponse.data);
          }
        } catch (shippingErr) {
          console.log("Pas d'informations de transport pour cet équipement");
        }
      }
  
      safeSetState(setError, null);
    } catch (err) {
      console.error("Erreur lors du chargement des données de l'équipement:", err);
      safeSetState(setError, "Impossible de charger les données de l'équipement");
    } finally {
      safeSetState(setLoading, false);
    }
  }, [id, safeSetState]);



  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCalculationResult = useCallback(
    (result) => {
      if (!result || !isMounted.current) return

      safeSetState(setCalculationResult, result)

      // Si le résultat a été enregistré, rediriger vers la liste
      if (result.saved) {
        // Utiliser setTimeout pour éviter les problèmes de rendu pendant la navigation
        const timeoutId = setTimeout(() => {
          if (isMounted.current) {
            navigate("/dashboard/shipping")
          }
        }, 1000)

        // Nettoyer le timeout si le composant est démonté
        return () => clearTimeout(timeoutId)
      }
    },
    [navigate, safeSetState],
  )

  const handleSave = useCallback(async () => {
    if (!calculationResult || !isMounted.current) {
      alert("Veuillez d'abord calculer les frais de transport.");
      return;
    }
  
    try {
      safeSetState(setSaving, true);
  
      if (id) {
        const shippingData = {
          weight_kg: calculationResult.weight_kg || calculationResult.effective_weight_kg,
          dimensions: calculationResult.dimensions || null,
          destination_country: calculationResult.country || calculationResult.destination_country,
          direction: calculationResult.direction,
          premium_service: calculationResult.premium_service || null,
        };
  
        console.log("Envoi des données pour enregistrement:", shippingData);
  
        // Utilisez PUT si c'est une mise à jour, POST si c'est une création
        const method = calculationResult.exists ? "put" : "post";
        const url = `/hardware/${id}/shipping`;
  
        const response = await API[method](url, shippingData);
        console.log("Réponse du serveur:", response.data);
  
        alert("Les frais de transport ont été enregistrés avec succès!");
        navigate("/dashboard/shipping");
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err);
      safeSetState(
        setError,
        `Une erreur est survenue lors de l'enregistrement: ${err.response?.data?.detail || err.message}`
      );
    } finally {
      safeSetState(setSaving, false);
    }
  }, [calculationResult, id, navigate, safeSetState]);

  if (loading) {
    return (
      <div className="shipping-loading">
        <div className="shipping-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  return (
    <div className="shipping-container">
      <div className="shipping-header">
        <div>
          <h1>
            <i className="fas fa-calculator me-3"></i>
            {id ? "Calculer les frais de transport pour un équipement" : "Calculateur de frais de transport"}
          </h1>
          <p>
            {id
              ? `Calculez les frais de transport pour ${hardware?.eq_reference || "l'équipement sélectionné"}`
              : "Calculez les frais de transport pour n'importe quelle expédition"}
          </p>
        </div>
        <button
          className="shipping-btn shipping-btn-secondary"
          onClick={() => navigate("/dashboard/shipping")}
          type="button"
        >
          <i className="fas fa-arrow-left me-2"></i>
          Retour
        </button>
      </div>

      {error && (
        <div className="shipping-error">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      <div className="shipping-card">
        {hardware && (
          <div className="hardware-info">
            <h3>Informations de l'équipement</h3>
            <div className="hardware-details">
              <div className="hardware-detail">
                <span>Référence:</span>
                <strong>{hardware.eq_reference}</strong>
              </div>
              <div className="hardware-detail">
                <span>Marque:</span>
                <strong>{hardware.brand}</strong>
              </div>
              <div className="hardware-detail">
                <span>PN:</span>
                <strong>{hardware.pn}</strong>
              </div>
              <div className="hardware-detail">
                <span>Poids:</span>
                <strong>{hardware.poids_kg ? `${hardware.poids_kg} kg` : "Non spécifié"}</strong>
              </div>
              <div className="hardware-detail">
                <span>Dimensions:</span>
                <strong>{hardware.dimensions || "Non spécifiées"}</strong>
              </div>
              <div className="hardware-detail">
                <span>Pays:</span>
                <strong>{hardware.country || "Non spécifié"}</strong>
              </div>
            </div>
          </div>
        )}

        <ShippingCalculator
          initialWeight={hardware?.poids_kg || 1}
          initialCountry={hardware?.country || "France"}
          initialDimensions={hardware?.dimensions || ""}
          onCalculate={handleCalculationResult}
          showMultiLeg={true}
          hardwareId={id}
          type={id ? "hardware" : "standalone"}
        />

        {calculationResult && !calculationResult.saved && (
          <div className="shipping-actions-container">
            <button
              className="shipping-btn shipping-btn-primary shipping-btn-lg"
              onClick={handleSave}
              disabled={saving}
              type="button"
            >
              {saving ? (
                <>
                  <div className="shipping-spinner-sm"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Enregistrer ce calcul
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShippingCalculate
