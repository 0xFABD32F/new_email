"use client"

import React from "react"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../../services/api"
import DevisGenerator from "../../components/DevisGenerator"
import "./DevisStyles.css"

// Hook personnalisé pour le debouncing
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Composant optimisé pour les items du devis
const DevisItemRow = React.memo(({ item, index, availableItems, onItemChange, onRemoveItem, currency }) => {
  const handleChange = useCallback(
    (e) => {
      onItemChange(index, e)
    },
    [index, onItemChange],
  )

  const handleRemove = useCallback(() => {
    onRemoveItem(index)
  }, [index, onRemoveItem])

  // CORRECTION: Fonction pour trouver l'item correspondant dans availableItems
  const findMatchingItem = useCallback(() => {
    if (!item.pn || !availableItems.length) return null

    // Chercher d'abord par product_id ou hardware_id si disponible
    if (item.product_id) {
      return availableItems.find((avItem) => avItem.type === "product" && avItem.id === item.product_id)
    }
    if (item.hardware_id) {
      return availableItems.find((avItem) => avItem.type === "hardware" && avItem.id === item.hardware_id)
    }

    // Sinon chercher par part number
    return availableItems.find((avItem) => avItem.pn && avItem.pn.toLowerCase() === item.pn.toLowerCase())
  }, [item, availableItems])

  // CORRECTION: Calculer la valeur du select automatiquement
  const getSelectValue = useCallback(() => {
    // Si l'item a déjà un product_id ou hardware_id, l'utiliser
    if (item.source_type && (item.product_id || item.hardware_id)) {
      return `${item.source_type}:${item.product_id || item.hardware_id}`
    }

    // Si c'est un item importé avec un part number, chercher la correspondance
    if (item.is_imported && item.pn) {
      const matchingItem = findMatchingItem()
      if (matchingItem) {
        return `${matchingItem.type}:${matchingItem.id}`
      }
    }

    return ""
  }, [item, findMatchingItem])

  return (
    <tr>
      <td>
        <strong>#{String(index + 1).padStart(2, "0")}</strong>
      </td>
      <td>
        {item.is_imported && item.pn ? (
          // CORRECTION: Pour les items importés, afficher le part number ET le select pré-rempli
          <div className="imported-item-container">
            <select name="item_selection" value={getSelectValue()} onChange={handleChange} className="imported-select">
              <option value="">Sélectionner...</option>
              <optgroup label="Produits">
                {availableItems
                  .filter((item) => item.type === "product")
                  .map((product) => (
                    <option key={`product-${product.id}`} value={`product:${product.id}`}>
                      {product.pn}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Hardware IT">
                {availableItems
                  .filter((item) => item.type === "hardware")
                  .map((hardware) => (
                    <option key={`hardware-${hardware.id}`} value={`hardware:${hardware.id}`}>
                      {hardware.pn}
                    </option>
                  ))}
              </optgroup>
            </select>
            <span className="imported-pn-display">{item.pn}</span>
          </div>
        ) : (
          <>
            <select name="item_selection" value={getSelectValue()} onChange={handleChange}>
              <option value="">Sélectionner...</option>
              <optgroup label="Produits">
                {availableItems
                  .filter((item) => item.type === "product")
                  .map((product) => (
                    <option key={`product-${product.id}`} value={`product:${product.id}`}>
                      {product.pn}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Hardware IT">
                {availableItems
                  .filter((item) => item.type === "hardware")
                  .map((hardware) => (
                    <option key={`hardware-${hardware.id}`} value={`hardware:${hardware.id}`}>
                      {hardware.pn}
                    </option>
                  ))}
              </optgroup>
            </select>
            {!item.source_type && (
              <input
                type="text"
                name="pn"
                value={item.pn || ""}
                onChange={handleChange}
                placeholder="Part Number"
                className="manual-input"
              />
            )}
          </>
        )}
      </td>
      <td>
        {item.is_imported ? (
          <span className="imported-item">{item.eq_reference || ""}</span>
        ) : (
          <input
            type="text"
            name="eq_reference"
            value={item.eq_reference || ""}
            onChange={handleChange}
            placeholder="Description"
          />
        )}
      </td>
      <td>
        <input
          type="number"
          name="qty"
          value={item.qty || 1}
          onChange={handleChange}
          min="1"
          required
          className="qty-input"
        />
      </td>
      <td>
        <span className="currency-unit">{currency || "MAD"}</span>
      </td>
      <td>
        <input
          type="number"
          name="unit_price"
          value={item.unit_price || 0}
          onChange={handleChange}
          step="0.01"
          min="0"
          required
          className="price-input"
        />
      </td>
      <td>
        <strong>
          {currency || "MAD"} {(item.total_price || 0).toFixed(2)}
        </strong>
      </td>
      <td>
        <button
          type="button"
          className="devis-btn-action devis-delete"
          onClick={handleRemove}
          disabled={item.is_imported}
        >
          <i className="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  )
})

function DevisForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  // Cache pour éviter les rechargements
  const dataCache = useRef({
    clients: null,
    availableItems: null,
    countries: null,
    premiumServices: null,
    exchangeRates: null,
  })

  const [clients, setClients] = useState([])
  const [availableItems, setAvailableItems] = useState([])
  const [countries, setCountries] = useState([])
  const [premiumServices, setPremiumServices] = useState({})
  const [exchangeRates, setExchangeRates] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)

  // État pour le shipping
  const [shippingEnabled, setShippingEnabled] = useState(false)
  const [shippingCalculating, setShippingCalculating] = useState(false)
  const [shippingResult, setShippingResult] = useState(null)

  const [formData, setFormData] = useState({
    reference: `DEV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
    devis_number: `DEV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
    date_creation: new Date().toISOString().split("T")[0],
    client_id: "",
    company_name: "",
    contact_name: "",
    contact_position: "",
    email: "",
    phone: "",
    country: "",
    sector_field: "",
    project: "",
    currency: "MAD",
    total_amount: 0,
    tva: "20",
    discount: "0",
    status: "Nouveau",
    po_client: "",
    eta: "",
    comment: "",
    items: [
      {
        id: Date.now(),
        product_id: null,
        hardware_id: null,
        source_type: "manual",
        brand: "",
        pn: "",
        eq_reference: "",
        qty: 1,
        unit: "MAD",
        unit_price: 0,
        total_price: 0,
        is_imported: false,
      },
    ],
    shipping: {
      enabled: false,
      total_weight_kg: 0,
      dimensions: "",
      destination_country: "",
      direction: "export",
      premium_service: "",
      is_multi_leg: false,
      legs: [{ origin_country: "Maroc", destination_country: "", direction: "export" }],
      shipping_cost: 0,
      shipping_cost_mad: 0,
      shipping_zone: null,
      effective_weight_kg: 0,
    },
  })

  // Debounce pour les calculs coûteux
  const debouncedItems = useDebounce(formData.items, 300)

  // Memoization des calculs de totaux
  const calculations = useMemo(() => {
    const subtotal = debouncedItems.reduce((total, item) => total + (item.total_price || 0), 0)
    const discountAmount = subtotal * (Number.parseFloat(formData.discount) / 100)
    const tvaAmount = (subtotal - discountAmount) * (Number.parseFloat(formData.tva) / 100)
    const totalAmount = subtotal - discountAmount + tvaAmount

    return {
      subtotal,
      discountAmount,
      tvaAmount,
      totalAmount,
    }
  }, [debouncedItems, formData.discount, formData.tva])

  // Mise à jour du total avec debounce
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      total_amount: calculations.totalAmount,
    }))
  }, [calculations.totalAmount])

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({
        ...item,
        unit: prev.currency || "MAD",
      })),
    }))
  }, [formData.currency])

  // CORRECTION: Fonction pour auto-associer les part numbers importés
  const autoAssociateImportedItems = useCallback((items, availableItems) => {
    return items.map((item) => {
      // Si l'item est importé et a un part number mais pas encore d'association
      if (item.is_imported && item.pn && !item.product_id && !item.hardware_id) {
        // Chercher une correspondance dans les items disponibles
        const matchingItem = availableItems.find(
          (avItem) => avItem.pn && avItem.pn.toLowerCase() === item.pn.toLowerCase(),
        )

        if (matchingItem) {
          console.log(`Auto-association trouvée pour ${item.pn}: ${matchingItem.type}:${matchingItem.id}`)
          return {
            ...item,
            product_id: matchingItem.type === "product" ? matchingItem.id : null,
            hardware_id: matchingItem.type === "hardware" ? matchingItem.id : null,
            source_type: matchingItem.type,
            brand: matchingItem.brand || item.brand,
            unit_price: matchingItem.unit_price || item.unit_price,
            total_price: (matchingItem.unit_price || item.unit_price) * item.qty,
          }
        }
      }
      return item
    })
  }, [])

  // Chargement optimisé des données
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true)

      // Charger en parallèle pour optimiser
      const [clientsResponse, itemsResponse, countriesResponse, premiumResponse, exchangeResponse] = await Promise.all([
        API.get("/clients/"),
        API.get("/devis/available-items"),
        API.get("/devis/shipping/countries"),
        API.get("/devis/shipping/premium-services"),
        API.get("/devis/exchange-rates"),
      ])

      // Mettre en cache
      dataCache.current = {
        clients: clientsResponse.data,
        availableItems: itemsResponse.data,
        countries: countriesResponse.data,
        premiumServices: premiumResponse.data.premium_services || {},
        exchangeRates: exchangeResponse.data.rates || {},
      }

      setClients(clientsResponse.data)
      setAvailableItems(itemsResponse.data)
      setCountries(countriesResponse.data)
      setPremiumServices(premiumResponse.data.premium_services || {})
      setExchangeRates(exchangeResponse.data.rates || {})

      if (isEditing) {
        const devisResponse = await API.get(`/devis/${id}`)
        const devisData = devisResponse.data

        // CORRECTION: Traitement amélioré des items avec auto-association
        const itemsWithFlags = devisData.items.map((item, index) => ({
          ...item,
          id: item.id || Date.now() + index,
          is_imported:
            item.source_type === "imported" || item.source_type === "hardware" || item.source_type === "product",
          unit: item.unit || "Unit",
          pn: item.pn || "",
          eq_reference: item.eq_reference || "",
          brand: item.brand || "",
          qty: item.qty || 1,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || 0,
        }))

        // CORRECTION: Auto-associer les items importés avec les items disponibles
        const autoAssociatedItems = autoAssociateImportedItems(itemsWithFlags, itemsResponse.data)

        // Initialiser les legs par défaut si nécessaire
        let legs = [{ origin_country: "Maroc", destination_country: "", direction: "export" }]
        if (devisData.shipping_info) {
          if (devisData.shipping_info.is_multi_leg && devisData.shipping_info.legs_data) {
            try {
              legs = JSON.parse(devisData.shipping_info.legs_data)
            } catch (e) {
              console.error("Erreur parsing legs_data:", e)
            }
          }
        }

        setFormData({
          ...devisData,
          reference: devisData.reference || "",
          devis_number: devisData.devis_number || "",
          client_id: devisData.client_id || "",
          company_name: devisData.company_name || "",
          contact_name: devisData.contact_name || "",
          contact_position: devisData.contact_position || "",
          email: devisData.email || "",
          phone: devisData.phone || "",
          country: devisData.country || "",
          sector_field: devisData.sector_field || "",
          project: devisData.project || "",
          currency: devisData.currency || "MAD",
          tva: devisData.tva?.toString() || "20",
          discount: devisData.discount?.toString() || "0",
          status: devisData.status || "Nouveau",
          po_client: devisData.po_client || "",
          eta: devisData.eta || "",
          comment: devisData.comment || "",
          items: autoAssociatedItems, // CORRECTION: Utiliser les items auto-associés
          shipping: {
            enabled: devisData.shipping_info?.enabled || false,
            total_weight_kg: devisData.shipping_info?.total_weight_kg || 0,
            dimensions: devisData.shipping_info?.dimensions || "",
            destination_country: devisData.shipping_info?.destination_country || "",
            direction: devisData.shipping_info?.direction || "export",
            premium_service: devisData.shipping_info?.premium_service || "",
            is_multi_leg: devisData.shipping_info?.is_multi_leg || false,
            legs: legs,
            shipping_cost: devisData.shipping_info?.shipping_cost || 0,
            shipping_cost_mad: devisData.shipping_info?.shipping_cost_mad || 0,
            shipping_zone: devisData.shipping_info?.shipping_zone || null,
            effective_weight_kg: devisData.shipping_info?.effective_weight_kg || 0,
          },
          // CORRECTION: Ajouter shipping_info pour le PDF
          shipping_info: devisData.shipping_info || null,
        })

        if (devisData.shipping_info) {
          setShippingEnabled(devisData.shipping_info.enabled)
        }

        const client = clientsResponse.data.find((c) => c.id === devisData.client_id)
        setSelectedClient(client)
      }

      setError(null)
    } catch (err) {
      console.error("Erreur de chargement:", err)
      setError("Impossible de charger les données nécessaires")
    } finally {
      setLoading(false)
    }
  }, [id, isEditing, autoAssociateImportedItems])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  // CORRECTION: Effet pour auto-associer les items quand availableItems change
  useEffect(() => {
    if (availableItems.length > 0 && formData.items.length > 0) {
      const hasImportedItems = formData.items.some(
        (item) => item.is_imported && item.pn && !item.product_id && !item.hardware_id,
      )

      if (hasImportedItems) {
        console.log("Auto-association des items importés...")
        const autoAssociatedItems = autoAssociateImportedItems(formData.items, availableItems)

        // Vérifier s'il y a eu des changements
        const hasChanges = autoAssociatedItems.some((item, index) => {
          const originalItem = formData.items[index]
          return item.product_id !== originalItem.product_id || item.hardware_id !== originalItem.hardware_id
        })

        if (hasChanges) {
          setFormData((prev) => ({
            ...prev,
            items: autoAssociatedItems,
          }))
        }
      }
    }
  }, [availableItems, autoAssociateImportedItems])

  // Handlers optimisés avec useCallback
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target

      if (name === "client_id") {
        const clientId = value ? Number.parseInt(value) : ""
        const client = clients.find((c) => c.id === clientId)
        setSelectedClient(client)

        if (client) {
          setFormData((prev) => ({
            ...prev,
            client_id: clientId,
            company_name: client.company_name || "",
            contact_name: client.contact_name || "",
            contact_position: client.contact_position || "",
            email: client.email || "",
            phone: client.phone || "",
            country: client.country || "",
            sector_field: client.sector_field || "",
            currency: client.currency || "MAD",
            shipping: {
              ...prev.shipping,
              destination_country: client.country || "",
            },
          }))
        } else {
          setFormData((prev) => ({
            ...prev,
            [name]: value,
          }))
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }))
      }
    },
    [clients],
  )

  const handleItemChange = useCallback(
    (index, e) => {
      const { name, value } = e.target

      setFormData((prev) => {
        const updatedItems = [...prev.items]

        if (name === "item_selection") {
          const [sourceType, itemId] = value.split(":")

          if (sourceType && itemId) {
            const selectedItem = availableItems.find(
              (item) => item.type === sourceType && item.id === Number.parseInt(itemId),
            )

            if (selectedItem) {
              updatedItems[index] = {
                ...updatedItems[index],
                product_id: sourceType === "product" ? selectedItem.id : null,
                hardware_id: sourceType === "hardware" ? selectedItem.id : null,
                source_type: sourceType,
                brand: selectedItem.brand || "",
                pn: selectedItem.pn || "",
                eq_reference: selectedItem.eq_reference || "",
                unit_price: selectedItem.unit_price || 0,
                total_price: (selectedItem.unit_price || 0) * (updatedItems[index].qty || 1),
                is_imported: false,
              }
            }
          } else {
            updatedItems[index] = {
              ...updatedItems[index],
              product_id: null,
              hardware_id: null,
              source_type: "manual",
              brand: "",
              pn: "",
              eq_reference: "",
              unit_price: 0,
              total_price: 0,
              is_imported: false,
            }
          }
        } else if (name === "qty") {
          const qty = Number.parseInt(value) || 1
          updatedItems[index] = {
            ...updatedItems[index],
            qty,
            total_price: qty * (updatedItems[index].unit_price || 0),
          }
        } else if (name === "unit_price") {
          const unitPrice = Number.parseFloat(value) || 0
          updatedItems[index] = {
            ...updatedItems[index],
            unit_price: unitPrice,
            total_price: unitPrice * (updatedItems[index].qty || 1),
          }
        } else {
          updatedItems[index] = {
            ...updatedItems[index],
            [name]: value || "",
          }
        }

        return {
          ...prev,
          items: updatedItems,
        }
      })
    },
    [availableItems],
  )

  const addItem = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now(),
          product_id: null,
          hardware_id: null,
          source_type: "manual",
          brand: "",
          pn: "",
          eq_reference: "",
          qty: 1,
          unit: prev.currency || "MAD",
          unit_price: 0,
          total_price: 0,
          is_imported: false,
        },
      ],
    }))
  }, [])

  const removeItem = useCallback(
    (index) => {
      if (formData.items.length > 1) {
        setFormData((prev) => ({
          ...prev,
          items: prev.items.filter((_, i) => i !== index),
        }))
      }
    },
    [formData.items.length],
  )

  const handleShippingChange = useCallback((e) => {
    const { name, value, type, checked } = e.target

    if (name === "shipping_enabled") {
      setShippingEnabled(checked)
      setFormData((prev) => ({
        ...prev,
        shipping: {
          ...prev.shipping,
          enabled: checked,
        },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        shipping: {
          ...prev.shipping,
          [name]: type === "checkbox" ? checked : value,
        },
      }))
    }
  }, [])

  // Handlers pour les legs multiples
  const handleLegChange = useCallback((index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      shipping: {
        ...prev.shipping,
        legs: (prev.shipping.legs || []).map((leg, i) => (i === index ? { ...leg, [field]: value } : leg)),
      },
    }))
  }, [])

  const addLeg = useCallback(() => {
    setFormData((prev) => {
      const currentLegs = prev.shipping.legs || []
      return {
        ...prev,
        shipping: {
          ...prev.shipping,
          legs: [
            ...currentLegs,
            {
              origin_country: currentLegs[currentLegs.length - 1]?.destination_country || "",
              destination_country: "",
              direction: "export",
            },
          ],
        },
      }
    })
  }, [])

  const removeLeg = useCallback(
    (index) => {
      const currentLegs = formData.shipping.legs || []
      if (currentLegs.length > 1) {
        setFormData((prev) => ({
          ...prev,
          shipping: {
            ...prev.shipping,
            legs: currentLegs.filter((_, i) => i !== index),
          },
        }))
      }
    },
    [formData.shipping.legs],
  )

  // CORRECTION: Fonction de calcul shipping avec sauvegarde automatique
  const calculateShipping = useCallback(async () => {
    if (!shippingEnabled || !formData.shipping.total_weight_kg || formData.shipping.total_weight_kg <= 0) {
      alert("Veuillez activer le shipping et saisir un poids total valide")
      return
    }

    if (!formData.shipping.is_multi_leg && !formData.shipping.destination_country) {
      alert("Veuillez sélectionner un pays de destination")
      return
    }

    const currentLegs = formData.shipping.legs || []
    if (formData.shipping.is_multi_leg && currentLegs.some((leg) => !leg.origin_country || !leg.destination_country)) {
      alert("Veuillez remplir tous les champs pour chaque étape du transport multi-étapes")
      return
    }

    try {
      setShippingCalculating(true)

      let response
      if (isEditing && id) {
        // Pour les devis existants, utiliser l'endpoint avec ID
        const shippingRequest = {
          total_weight_kg: formData.shipping.total_weight_kg,
          dimensions: formData.shipping.dimensions || null,
          destination_country: formData.shipping.destination_country,
          direction: formData.shipping.direction,
          premium_service: formData.shipping.premium_service || null,
          is_multi_leg: formData.shipping.is_multi_leg,
          legs: formData.shipping.is_multi_leg ? currentLegs : null,
        }
        response = await API.post(`/devis/${id}/calculate-shipping`, shippingRequest)
      } else {
        // Pour les nouveaux devis, utiliser l'endpoint de calcul direct
        if (formData.shipping.is_multi_leg) {
          const legsString = currentLegs.map((leg) => `${leg.origin_country}:${leg.destination_country}`).join(",")
          response = await API.get("/shipping/calculate-multi-leg", {
            params: {
              weight_kg: formData.shipping.total_weight_kg,
              legs: legsString,
              dimensions: formData.shipping.dimensions,
              premium_service: formData.shipping.premium_service,
              currency: formData.currency,
            },
          })
        } else {
          response = await API.get("/shipping/calculate", {
            params: {
              weight_kg: formData.shipping.total_weight_kg,
              country: formData.shipping.destination_country,
              direction: formData.shipping.direction,
              dimensions: formData.shipping.dimensions,
              premium_service: formData.shipping.premium_service,
              currency: formData.currency,
            },
          })
        }
      }

      console.log("Réponse API shipping:", response.data)

      // Vérifier que les propriétés existent avant de les utiliser
      const shippingCost = response.data.shipping_cost || 0
      const shippingCostMad = response.data.shipping_cost_mad || response.data.total_cost_mad || 0
      const effectiveWeight =
        response.data.effective_weight_kg || response.data.effective_weight || formData.shipping.total_weight_kg

      setShippingResult(response.data)

      // CORRECTION: Mettre à jour les données de shipping ET shipping_info + SAUVEGARDER IMMÉDIATEMENT
      const updatedShippingData = {
        enabled: true,
        shipping_cost: shippingCost,
        shipping_cost_mad: shippingCostMad,
        shipping_zone: response.data.zone,
        effective_weight_kg: effectiveWeight,
        total_weight_kg: formData.shipping.total_weight_kg,
        destination_country: formData.shipping.destination_country,
        direction: formData.shipping.direction,
        premium_service: formData.shipping.premium_service,
        is_multi_leg: formData.shipping.is_multi_leg,
        legs_data: formData.shipping.is_multi_leg ? JSON.stringify(currentLegs) : null,
        dimensions: formData.shipping.dimensions,
      }

      setFormData((prev) => ({
        ...prev,
        shipping: {
          ...prev.shipping,
          shipping_cost: shippingCost,
          shipping_cost_mad: shippingCostMad,
          shipping_zone: response.data.zone,
          effective_weight_kg: effectiveWeight,
        },
        // CORRECTION: Mettre à jour shipping_info pour le PDF
        shipping_info: updatedShippingData,
      }))

      // CORRECTION: SAUVEGARDER AUTOMATIQUEMENT LES DONNÉES DE SHIPPING
      if (!isEditing) {
        // Pour les nouveaux devis, on sauvegarde temporairement les données
        console.log("Sauvegarde temporaire des données de shipping pour nouveau devis")
        // Les données seront sauvegardées lors de la création du devis
      } else {
        // Pour les devis existants, on met à jour immédiatement
        try {
          console.log("Mise à jour immédiate des données de shipping pour devis existant")
          const updateData = {
            ...formData,
            shipping: {
              enabled: true,
              total_weight_kg: formData.shipping.total_weight_kg,
              dimensions: formData.shipping.dimensions || null,
              destination_country: formData.shipping.destination_country || "",
              direction: formData.shipping.direction || "export",
              premium_service: formData.shipping.premium_service || null,
              is_multi_leg: formData.shipping.is_multi_leg || false,
              legs: formData.shipping.is_multi_leg ? currentLegs : null,
            },
          }
          await API.put(`/devis/${id}`, updateData)
          console.log("Données de shipping sauvegardées avec succès")
        } catch (saveError) {
          console.warn("Erreur lors de la sauvegarde automatique:", saveError)
          // Ne pas bloquer l'utilisateur, juste un warning
        }
      }

      const currencySymbol = formData.currency
      alert(`Frais de transport calculés: ${shippingCost.toFixed(2)} ${currencySymbol}`)
    } catch (err) {
      console.error("Erreur lors du calcul du shipping:", err)
      alert("Erreur lors du calcul des frais de transport")
    } finally {
      setShippingCalculating(false)
    }
  }, [shippingEnabled, formData, id, isEditing])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()

      try {
        setSaving(true)

        // CORRECTION FINALE: Assurer que les données de shipping sont toujours incluses
        const shippingData = shippingEnabled
          ? {
              enabled: true,
              total_weight_kg: formData.shipping.total_weight_kg || 0,
              dimensions: formData.shipping.dimensions || null,
              destination_country: formData.shipping.destination_country || "",
              direction: formData.shipping.direction || "export",
              premium_service: formData.shipping.premium_service || null,
              is_multi_leg: formData.shipping.is_multi_leg || false,
              legs: formData.shipping.is_multi_leg ? formData.shipping.legs : null,
              // AJOUT: Inclure directement les données de coût dans l'objet shipping
              shipping_cost: formData.shipping.shipping_cost || 0,
              shipping_cost_mad: formData.shipping.shipping_cost_mad || 0,
              shipping_zone: formData.shipping.shipping_zone || null,
              effective_weight_kg: formData.shipping.effective_weight_kg || 0,
            }
          : { enabled: false }

        // Créer l'objet shipping_info complet si disponible
        const shippingInfo =
          shippingEnabled && (formData.shipping_info || formData.shipping.shipping_cost > 0)
            ? {
                enabled: true,
                shipping_cost: formData.shipping_info?.shipping_cost || formData.shipping.shipping_cost || 0,
                shipping_cost_mad:
                  formData.shipping_info?.shipping_cost_mad || formData.shipping.shipping_cost_mad || 0,
                shipping_zone: formData.shipping_info?.shipping_zone || formData.shipping.shipping_zone || null,
                effective_weight_kg:
                  formData.shipping_info?.effective_weight_kg || formData.shipping.effective_weight_kg || 0,
                total_weight_kg: formData.shipping.total_weight_kg || 0,
                destination_country: formData.shipping.destination_country || "",
                direction: formData.shipping.direction || "export",
                premium_service: formData.shipping.premium_service || null,
                is_multi_leg: formData.shipping.is_multi_leg || false,
                legs_data: formData.shipping.is_multi_leg ? JSON.stringify(formData.shipping.legs) : null,
                dimensions: formData.shipping.dimensions || null,
              }
            : null

        const devisData = {
          ...formData,
          client_id: formData.client_id ? Number.parseInt(formData.client_id) : null,
          tva: Number.parseFloat(formData.tva) || 0,
          discount: Number.parseFloat(formData.discount) || 0,
          total_amount: Number.parseFloat(formData.total_amount) || 0,
          items: formData.items.map((item) => ({
            product_id: item.product_id,
            hardware_id: item.hardware_id,
            source_type: item.source_type,
            brand: item.brand || "",
            pn: item.pn || "",
            eq_reference: item.eq_reference || "",
            qty: Number.parseInt(item.qty) || 1,
            unit: item.unit || "Unit",
            unit_price: Number.parseFloat(item.unit_price) || 0,
          })),
          shipping: shippingData,
          shipping_info: shippingInfo,
          // AJOUT: Inclure aussi le coût de shipping directement dans l'objet principal
          shipping_cost: shippingEnabled ? formData.shipping.shipping_cost || 0 : 0,
        }

        if (isEditing) {
          await API.put(`/devis/${id}`, devisData)
        } else {
          await API.post("/devis/", devisData)
        }

        navigate("/dashboard/devis")
      } catch (err) {
        console.error("Erreur lors de l'enregistrement:", err)
        setError("Une erreur est survenue lors de l'enregistrement")
        setSaving(false)
      }
    },
    [formData, shippingEnabled, isEditing, id, navigate],
  )

  if (loading) {
    return (
      <div className="devis-loading">
        <div className="devis-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  return (
    <div className="devis-container">
      <div className="devis-header">
        <div>
          <h1>
            <i className={`fas ${isEditing ? "fa-edit" : "fa-plus-circle"} me-3`}></i>
            {isEditing ? "Modifier le devis" : "Créer un devis"}
          </h1>
          <p>{isEditing ? "Mettez à jour les informations" : "Remplissez le formulaire"}</p>
        </div>
        <div className="devis-header-actions">
          {/* Permettre la génération de PDF même pour les nouveaux devis si le shipping a été calculé */}
          {(isEditing || (shippingEnabled && formData.shipping.shipping_cost > 0)) && (
            <DevisGenerator
              devisData={formData}
              logoPath="/assets/logo_oddnet.png"
              onGenerate={(pdfName) => {
                alert(`Le PDF ${pdfName} a été généré avec succès!`)
              }}
            />
          )}
          <button className="devis-btn devis-btn-secondary" onClick={() => navigate("/dashboard/devis")}>
            <i className="fas fa-arrow-left me-2"></i>
            Retour
          </button>
        </div>
      </div>

      {error && (
        <div className="devis-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <div className="devis-card">
        <form onSubmit={handleSubmit} className="devis-form">
          {/* Sections client et projet */}
          <div className="form-grid">
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-file-invoice-dollar me-2"></i>Informations du devis
                </h3>

                <div className="form-group">
                  <label htmlFor="client_id">Client</label>
                  <div className="input-wrapper">
                    <i className="fas fa-building"></i>
                    <select id="client_id" name="client_id" value={formData.client_id} onChange={handleChange} required>
                      <option value="">Sélectionner un client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reference">Référence du devis</label>
                  <div className="input-wrapper">
                    <i className="fas fa-hashtag"></i>
                    <input
                      type="text"
                      id="reference"
                      name="reference"
                      value={formData.reference}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="devis_number">Numéro du devis</label>
                  <div className="input-wrapper">
                    <i className="fas fa-hashtag"></i>
                    <input
                      type="text"
                      id="devis_number"
                      name="devis_number"
                      value={formData.devis_number}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="date_creation">Date du devis</label>
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
                      <option value="Nouveau">Nouveau</option>
                      <option value="Envoyé">Envoyé</option>
                      <option value="Accepté">Accepté</option>
                      <option value="Refusé">Refusé</option>
                      <option value="En attente">En attente</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>
                  <i className="fas fa-project-diagram me-2"></i>Informations du projet
                </h3>

                <div className="form-group">
                  <label htmlFor="project">Description du projet</label>
                  <div className="input-wrapper">
                    <i className="fas fa-align-left"></i>
                    <textarea
                      id="project"
                      name="project"
                      value={formData.project}
                      onChange={handleChange}
                      rows="4"
                      required
                    ></textarea>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="eta">Date de livraison estimée</label>
                  <div className="input-wrapper">
                    <i className="fas fa-truck-loading"></i>
                    <input
                      type="text"
                      id="eta"
                      name="eta"
                      value={formData.eta}
                      onChange={handleChange}
                      placeholder="Ex: 2 semaines"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="comment">Commentaires</label>
                  <div className="input-wrapper">
                    <i className="fas fa-comment"></i>
                    <textarea
                      id="comment"
                      name="comment"
                      value={formData.comment}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Commentaires additionnels..."
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-money-bill-wave me-2"></i>Informations financières
                </h3>

                <div className="form-group">
                  <label htmlFor="currency">Devise</label>
                  <div className="input-wrapper">
                    <i className="fas fa-dollar-sign"></i>
                    <select id="currency" name="currency" value={formData.currency} onChange={handleChange} required>
                      <option value="MAD">MAD</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  {exchangeRates[formData.currency] && formData.currency !== "MAD" && (
                    <small className="exchange-rate-info">
                      Taux de change: 1 MAD = {exchangeRates[formData.currency]} {formData.currency}
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="tva">TVA (%)</label>
                  <div className="input-wrapper">
                    <i className="fas fa-percentage"></i>
                    <input
                      type="number"
                      id="tva"
                      name="tva"
                      value={formData.tva}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="discount">Remise (%)</label>
                  <div className="input-wrapper">
                    <i className="fas fa-tags"></i>
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
              </div>

              {selectedClient && (
                <div className="form-section">
                  <h3>
                    <i className="fas fa-info-circle me-2"></i>Informations du client
                  </h3>
                  <div className="client-info">
                    <p>
                      <strong>Société:</strong> {selectedClient.company_name}
                    </p>
                    <p>
                      <strong>Pays:</strong> {selectedClient.country || "N/A"}
                    </p>
                    <p>
                      <strong>Devise:</strong> {selectedClient.currency || "MAD"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Articles du devis */}
          <div className="form-section mt-4">
            <h3>
              <i className="fas fa-list me-2"></i>Articles du devis
            </h3>

            <div className="devis-items-table">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                    <th>Total Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <DevisItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      availableItems={availableItems}
                      onItemChange={handleItemChange}
                      onRemoveItem={removeItem}
                      currency={formData.currency}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" className="devis-btn devis-btn-secondary mt-3" onClick={addItem}>
              <i className="fas fa-plus me-2"></i>Ajouter un article
            </button>
          </div>

          {/* Section Transport DHL */}
          <div className="form-section mt-4">
            <h3>
              <i className="fas fa-truck me-2"></i>Transport DHL (Optionnel)
            </h3>

            <div className="shipping-toggle">
              <label className="shipping-checkbox-label">
                <input
                  type="checkbox"
                  name="shipping_enabled"
                  checked={shippingEnabled}
                  onChange={handleShippingChange}
                />
                <span className="checkmark"></span>
                Activer le transport DHL pour ce devis
              </label>
            </div>

            {shippingEnabled && (
              <div className="shipping-form-section">
                {/* Résumé des informations de shipping */}
                <div className="shipping-info-card">
                  <div className="shipping-summary">
                    <div className="shipping-summary-item">
                      <span>POIDS TOTAL :</span>
                      <strong>{formData.shipping.total_weight_kg || 0} kg</strong>
                    </div>
                    {formData.shipping.effective_weight_kg > 0 && (
                      <div className="shipping-summary-item">
                        <span>Poids effectif:</span>
                        <strong>{formData.shipping.effective_weight_kg.toFixed(2)} kg</strong>
                      </div>
                    )}
                    {formData.shipping.shipping_cost > 0 && (
                      <div className="shipping-summary-item">
                        <span>Coût de transport:</span>
                        <strong>
                          {formData.shipping.shipping_cost.toFixed(2)} {formData.currency}
                        </strong>
                        {formData.currency !== "MAD" && formData.shipping.shipping_cost_mad > 0 && (
                          <small className="original-cost">
                            (Original: {formData.shipping.shipping_cost_mad.toFixed(2)} MAD)
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Informations de base du transport */}
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="shipping_weight">
                      Poids (kg) <span style={{ color: "red" }}>*</span>
                    </label>
                    <div className="input-wrapper">
                      <i className="fas fa-weight"></i>
                      <input
                        type="number"
                        id="shipping_weight"
                        name="total_weight_kg"
                        value={formData.shipping.total_weight_kg}
                        onChange={handleShippingChange}
                        step="0.1"
                        min="0.1"
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="shipping_dimensions">Dimensions (LxlxH cm)</label>
                    <div className="input-wrapper">
                      <i className="fas fa-ruler-combined"></i>
                      <input
                        type="text"
                        id="shipping_dimensions"
                        name="dimensions"
                        value={formData.shipping.dimensions}
                        onChange={handleShippingChange}
                        placeholder="Ex: 30x20x15"
                      />
                    </div>
                    <small>Format: Longueur x largeur x hauteur en centimètres</small>
                  </div>
                </div>

                {/* Transport multi-étapes */}
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="is_multi_leg"
                      checked={formData.shipping.is_multi_leg}
                      onChange={handleShippingChange}
                    />
                    <span style={{ marginLeft: "8px" }}>Transport multi-étapes</span>
                  </label>
                </div>

                {formData.shipping.is_multi_leg ? (
                  // Mode multi-étapes
                  <div className="multi-leg-section">
                    <h4>
                      <i className="fas fa-route me-2"></i>Étapes du transport
                    </h4>
                    {formData.shipping.legs.map((leg, index) => (
                      <div key={index} className="leg-item">
                        <div className="leg-header">
                          <h5>Étape {index + 1}</h5>
                          {formData.shipping.legs.length > 1 && (
                            <button
                              type="button"
                              className="devis-btn-action devis-delete"
                              onClick={() => removeLeg(index)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                        <div className="form-grid">
                          <div className="form-group">
                            <label>Pays d'origine</label>
                            <div className="input-wrapper">
                              <i className="fas fa-map-marker-alt"></i>
                              <select
                                value={leg.origin_country}
                                onChange={(e) => handleLegChange(index, "origin_country", e.target.value)}
                                required
                              >
                                <option value="">Sélectionner un pays</option>
                                {countries.map((country) => (
                                  <option key={country} value={country}>
                                    {country}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Pays de destination</label>
                            <div className="input-wrapper">
                              <i className="fas fa-map-marker-alt"></i>
                              <select
                                value={leg.destination_country}
                                onChange={(e) => handleLegChange(index, "destination_country", e.target.value)}
                                required
                              >
                                <option value="">Sélectionner un pays</option>
                                {countries.map((country) => (
                                  <option key={country} value={country}>
                                    {country}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Direction</label>
                            <div className="input-wrapper">
                              <i className="fas fa-exchange-alt"></i>
                              <select
                                value={leg.direction}
                                onChange={(e) => handleLegChange(index, "direction", e.target.value)}
                              >
                                <option value="export">Exportation</option>
                                <option value="import">Importation</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="devis-btn devis-btn-secondary" onClick={addLeg}>
                      <i className="fas fa-plus me-2"></i>Ajouter une étape
                    </button>
                  </div>
                ) : (
                  // Mode simple
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="shipping_destination_country">
                        Pays de destination <span style={{ color: "red" }}>*</span>
                      </label>
                      <div className="input-wrapper">
                        <i className="fas fa-globe"></i>
                        <select
                          id="shipping_destination_country"
                          name="destination_country"
                          value={formData.shipping.destination_country}
                          onChange={handleShippingChange}
                          required
                        >
                          <option value="">Sélectionner un pays</option>
                          {countries.map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="shipping_direction">Direction</label>
                      <div className="input-wrapper">
                        <i className="fas fa-exchange-alt"></i>
                        <select
                          id="shipping_direction"
                          name="direction"
                          value={formData.shipping.direction}
                          onChange={handleShippingChange}
                        >
                          <option value="export">Exportation</option>
                          <option value="import">Importation</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="shipping_premium_service">Prime de service</label>
                      <div className="input-wrapper">
                        <i className="fas fa-star"></i>
                        <select
                          id="shipping_premium_service"
                          name="premium_service"
                          value={formData.shipping.premium_service}
                          onChange={handleShippingChange}
                        >
                          <option value="">Aucun</option>
                          {Object.entries(premiumServices).map(([service, price]) => (
                            <option key={service} value={service}>
                              {service} (+{price} MAD)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions de calcul - MAINTENANT DISPONIBLE POUR TOUS LES DEVIS */}
                <div className="shipping-actions">
                  <button
                    type="button"
                    className="devis-btn devis-btn-primary"
                    onClick={calculateShipping}
                    disabled={
                      shippingCalculating ||
                      !formData.shipping.total_weight_kg ||
                      (formData.shipping.is_multi_leg
                        ? formData.shipping.legs.some((leg) => !leg.origin_country || !leg.destination_country)
                        : !formData.shipping.destination_country)
                    }
                  >
                    {shippingCalculating ? (
                      <>
                        <div className="devis-spinner-sm"></div>
                        Calcul en cours...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-calculator me-2"></i>
                        Calculer les frais de transport DHL
                      </>
                    )}
                  </button>
                </div>

                {/* Résultat du calcul */}
                {shippingResult && (
                  <div className="shipping-result">
                    <h4>
                      <i className="fas fa-check-circle me-2"></i>
                      Résultat du calcul DHL
                    </h4>
                    <div className="shipping-result-details">
                      <div className="shipping-result-item">
                        <span>Poids total:</span>
                        <strong>{shippingResult.weight_kg || shippingResult.total_weight} kg</strong>
                      </div>
                      <div className="shipping-result-item">
                        <span>Poids effectif:</span>
                        <strong>{shippingResult.effective_weight_kg || shippingResult.effective_weight} kg</strong>
                      </div>
                      <div className="shipping-result-item">
                        <span>Destination:</span>
                        <strong>{shippingResult.destination_country || shippingResult.country}</strong>
                      </div>
                      <div className="shipping-result-item">
                        <span>Zone DHL:</span>
                        <strong>{shippingResult.zone}</strong>
                      </div>
                      <div className="shipping-result-item total">
                        <span>Coût de transport:</span>
                        <strong>
                          {(shippingResult.shipping_cost || 0).toFixed(2)}{" "}
                          {shippingResult.currency || formData.currency}
                        </strong>
                      </div>
                      {formData.currency !== "MAD" && shippingResult.shipping_cost_mad && (
                        <div className="shipping-result-item">
                          <span>Coût original (MAD):</span>
                          <strong>{shippingResult.shipping_cost_mad.toFixed(2)} MAD</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Récapitulatif */}
          <div className="form-section mt-4">
            <h3>
              <i className="fas fa-calculator me-2"></i>Récapitulatif
            </h3>

            <div className="devis-summary">
              <div className="devis-summary-row">
                <span>Sous-total:</span>
                <span>
                  {formData.currency} {calculations.subtotal.toFixed(2)}
                </span>
              </div>

              {formData.discount > 0 && (
                <div className="devis-summary-row">
                  <span>Remise ({formData.discount}%):</span>
                  <span>
                    -{formData.currency} {calculations.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="devis-summary-row">
                <span>TVA ({formData.tva}%):</span>
                <span>
                  {formData.currency} {calculations.tvaAmount.toFixed(2)}
                </span>
              </div>

              {shippingEnabled && formData.shipping.shipping_cost > 0 && (
                <div className="devis-summary-row">
                  <span>Frais de transport DHL:</span>
                  <span>
                    {formData.currency} {formData.shipping.shipping_cost.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="devis-summary-row total">
                <span>Total:</span>
                <span>
                  {formData.currency} {(calculations.totalAmount + (formData.shipping.shipping_cost || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="devis-btn devis-btn-secondary"
              onClick={() => navigate("/dashboard/devis")}
              disabled={saving}
            >
              <i className="fas fa-times me-2"></i>
              Annuler
            </button>
            <button type="submit" className="devis-btn devis-btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <div className="devis-spinner-sm"></div>
                  {isEditing ? "Mise à jour..." : "Création..."}
                </>
              ) : (
                <>
                  <i className={`fas ${isEditing ? "fa-save" : "fa-plus-circle"} me-2`}></i>
                  {isEditing ? "Mettre à jour" : "Créer le devis"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DevisForm
