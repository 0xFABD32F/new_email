"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import API from "../../services/api"
import "./HardwareStyles.css"

function HardwareList() {
  const [hardware, setHardware] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [brandFilter, setBrandFilter] = useState("Toutes les marques")
  const [countryFilter, setCountryFilter] = useState("Tous les pays")
  const [brands, setBrands] = useState([])
  const [countries, setCountries] = useState([])
  const [totalValue, setTotalValue] = useState(0)
  const [displayCount, setDisplayCount] = useState(0)

  useEffect(() => {
    fetchHardware()
  }, [])

  const fetchHardware = async () => {
    try {
      setLoading(true)
      const response = await API.get("/hardware/")
      setHardware(response.data)

      // Extraire les marques et pays uniques pour les filtres
      const uniqueBrands = ["Toutes les marques", ...new Set(response.data.map((item) => item.brand))]
      const uniqueCountries = ["Tous les pays", ...new Set(response.data.map((item) => item.country).filter(Boolean))]

      setBrands(uniqueBrands)
      setCountries(uniqueCountries)

      // Calculer la valeur totale
      const total = response.data.reduce((sum, item) => sum + (Number.parseFloat(item.total_price) || 0), 0)
      setTotalValue(total)
    } catch (err) {
      console.error("Erreur lors du chargement des équipements:", err)
      setError("Impossible de charger les équipements. Veuillez réessayer plus tard.")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleBrandFilter = (e) => {
    setBrandFilter(e.target.value)
  }

  const handleCountryFilter = (e) => {
    setCountryFilter(e.target.value)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setBrandFilter("Toutes les marques")
    setCountryFilter("Tous les pays")
  }

  const handleDelete = (id) => {
    // Placeholder for delete functionality
    console.log("Delete item with id:", id)
  }

  // Filtrer les équipements en fonction des critères de recherche et des filtres
  const filteredHardware = hardware.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.eq_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.devis_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesBrand = brandFilter === "Toutes les marques" || item.brand === brandFilter
    const matchesCountry = countryFilter === "Tous les pays" || item.country === countryFilter

    return matchesSearch && matchesBrand && matchesCountry
  })

  useEffect(() => {
    setDisplayCount(filteredHardware.length)
  }, [filteredHardware])

  if (loading) {
    return (
      <div className="hw-loading">
        <div className="hw-spinner"></div>
        <p>Chargement des équipements...</p>
      </div>
    )
  }

  return (
    <div className="hw-container">
      <div className="hw-header">
        <div>
          <h1>
            <i className="fas fa-microchip me-3"></i>Hardware IT & Telco
          </h1>
          <p>Gérez vos équipements informatiques et télécommunications</p>
        </div>
        <div className="hw-header-actions">
          <Link to="/dashboard/shipping" className="hw-btn hw-btn-secondary">
            <i className="fas fa-truck-loading me-2"></i> Frais de transport
          </Link>

          {/* Bouton d'importation de devis Excel */}
          <Link to="/dashboard/hardware/import" className="hw-btn hw-btn-secondary">
            <i className="fas fa-file-import me-2"></i> Importer un devis
          </Link>

          <Link to="/dashboard/hardware/new" className="hw-btn hw-btn-primary">
            <i className="fas fa-plus me-2"></i> Ajouter un équipement
          </Link>
        </div>
      </div>

      {error && (
        <div className="hw-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <div className="hw-card">
        <div className="hw-filters">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Rechercher un équipement..." value={searchTerm} onChange={handleSearch} />
          </div>

          <div className="filter-group">
            <select value={brandFilter} onChange={handleBrandFilter}>
              {brands.map((brand, index) => (
                <option key={index} value={brand}>
                  {brand}
                </option>
              ))}
            </select>

            <select value={countryFilter} onChange={handleCountryFilter}>
              {countries.map((country, index) => (
                <option key={index} value={country}>
                  {country}
                </option>
              ))}
            </select>

            <button className="hw-btn hw-btn-outline" onClick={resetFilters}>
              <i className="fas fa-sync-alt me-2"></i>Réinitialiser
            </button>
          </div>
        </div>

        <div className="hw-table-container">
          <table className="hw-table">
            <thead>
              <tr>
                <th>Marque</th>
                <th>Référence</th>
                <th>Fournisseur</th>
                <th>Client</th>
                <th>N° Devis</th>
                <th>Qté</th>
                <th>Prix unitaire</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHardware.length > 0 ? (
                filteredHardware.map((item) => (
                  <tr key={item.id}>
                    <td>{item.brand}</td>
                    <td>
                      <div className="reference-cell">
                        <div>{item.eq_reference}</div>
                        <div className="pn-text">PN: {item.pn}</div>
                      </div>
                    </td>
                    <td>
                      <div className="supplier-cell">
                        <div>{item.supplier?.company || "N/A"}</div>
                        <div className="country-text">{item.country}</div>
                      </div>
                    </td>
                    <td>{item.customer?.company_name || "N/A"}</td>
                    <td>{item.devis_number || "N/A"}</td>
                    <td>{item.qty}</td>
                    <td>{Number.parseFloat(item.unit_price).toLocaleString("fr-FR")} MAD</td>
                    <td>{Number.parseFloat(item.total_price).toLocaleString("fr-FR")} MAD</td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>
                        {item.status === "ongoing"
                          ? "En cours"
                          : item.status === "completed"
                            ? "Terminé"
                            : item.status === "cancelled"
                              ? "Annulé"
                              : item.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/dashboard/hardware/edit/${item.id}`} className="action-btn edit-btn">
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button className="action-btn delete-btn" onClick={() => handleDelete(item.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
                        <Link
                          to={`/dashboard/hardware/shipping/calculate/${item.id}`}
                          className="action-btn shipping-btn"
                        >
                          <i className="fas fa-truck"></i>
                        </Link>
                        <Link to={`/dashboard/hardware/generate-excel/${item.id}`} className="action-btn excel-btn">
                          <i className="fas fa-file-excel"></i>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="no-data">
                    <i className="fas fa-info-circle me-2"></i>
                    Aucun équipement trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="hw-table-footer">
          <div className="hw-table-info">
            <span>Total: {displayCount}</span>
            <span>Affichés: {displayCount}</span>
            <span>Valeur totale: {totalValue.toLocaleString("fr-FR")} MAD</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HardwareList
