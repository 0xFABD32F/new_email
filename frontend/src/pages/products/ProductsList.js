"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import API from "../../services/api"
import "./ProductsStyles.css"

function ProductsList() {
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBrand, setFilterBrand] = useState("")
  const [filterSupplier, setFilterSupplier] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Charger les produits
      const productsResponse = await API.get("/products/")
      setProducts(productsResponse.data)

      // Charger les fournisseurs pour le filtre
      const suppliersResponse = await API.get("/suppliers/")
      setSuppliers(suppliersResponse.data)

      setError(null)
    } catch (err) {
      console.error("Erreur de chargement:", err)
      setError("Impossible de charger les données")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      try {
        await API.delete(`/products/${id}`)
        setProducts((prev) => prev.filter((product) => product.id !== id))
      } catch (err) {
        console.error("Erreur lors de la suppression:", err)
        setError("Erreur lors de la suppression du produit")
      }
    }
  }

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId)
    return supplier ? supplier.company : "N/A"
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchTerm ||
      product.pn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.eq_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesBrand = !filterBrand || product.brand === filterBrand
    const matchesSupplier = !filterSupplier || product.supplier_id === Number.parseInt(filterSupplier)

    return matchesSearch && matchesBrand && matchesSupplier
  })

  // Obtenir les marques uniques pour le filtre
  const uniqueBrands = [...new Set(products.map((product) => product.brand).filter(Boolean))]

  if (loading) {
    return (
      <div className="products-loading">
        <div className="products-spinner"></div>
        <p>Chargement des produits...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="products-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Une erreur est survenue</h3>
        <p>{error}</p>
        <button onClick={fetchData} className="products-btn products-btn-primary">
          <i className="fas fa-sync-alt me-2"></i>Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="products-container">
      <div className="products-header">
        <div>
          <h1>
            <i className="fas fa-box me-3"></i>Gestion des Produits
          </h1>
          <p>Gérez votre catalogue de produits</p>
        </div>
        <div className="products-header-actions">
          <Link to="/dashboard/shipping" className="products-btn products-btn-secondary">
            <i className="fas fa-truck-loading me-2"></i> Frais de transport
          </Link>
          <Link to="/dashboard/products/new" className="products-btn products-btn-primary">
            <i className="fas fa-plus me-2"></i> Ajouter un produit
          </Link>
        </div>
      </div>

      <div className="products-filters">
        <div className="products-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="products-select">
          <option value="">Toutes les marques</option>
          {uniqueBrands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>

        <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} className="products-select">
          <option value="">Tous les fournisseurs</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.company}
            </option>
          ))}
        </select>

        <button className="products-btn-icon" onClick={fetchData} title="Rafraîchir">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      <div className="products-card">
        <div className="products-table-container">
          <table>
            <thead>
              <tr>
                <th>Marque</th>
                <th>Référence (PN)</th>
                <th>Description</th>
                <th>Fournisseur</th>
                <th>Coût unitaire</th>
                <th>Devise</th>
                <th>Taux</th>
                <th>Coût (MAD)</th>
                <th>Marge (%)</th>
                <th>Poids (kg)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.brand}</td>
                    <td>{product.pn}</td>
                    <td>
                      <div className="products-description" title={product.eq_reference}>
                        {product.eq_reference}
                      </div>
                    </td>
                    <td>{getSupplierName(product.supplier_id)}</td>
                    <td>{product.unit_cost.toFixed(2)}</td>
                    <td>{product.currency}</td>
                    <td>{product.rate.toFixed(2)}</td>
                    <td>{product.unit_cost_mad.toFixed(2)}</td>
                    <td>{product.p_margin}%</td>
                    <td>{product.poids_kg || "N/A"}</td>
                    <td>
                      <div className="products-actions">
                        <Link
                          to={`/dashboard/products/edit/${product.id}`}
                          className="products-btn-action products-edit"
                          title="Modifier"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button
                          className="products-btn-action products-delete"
                          onClick={() => handleDelete(product.id)}
                          title="Supprimer"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                        <Link
                          to={`/dashboard/product-shipping/calculate/${product.id}`}
                          className="products-btn-action products-shipping"
                          title="Calculer les frais de transport"
                        >
                          <i className="fas fa-calculator"></i>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="products-empty">
                    <div>
                      <i className="fas fa-search"></i>
                      <h3>Aucun produit trouvé</h3>
                      <p>Aucun produit ne correspond à vos critères ou aucun produit n'a été créé.</p>
                      {searchTerm || filterBrand || filterSupplier ? (
                        <button
                          className="products-btn products-btn-secondary"
                          onClick={() => {
                            setSearchTerm("")
                            setFilterBrand("")
                            setFilterSupplier("")
                          }}
                        >
                          Effacer les filtres
                        </button>
                      ) : (
                        <Link to="/dashboard/products/new" className="products-btn products-btn-primary">
                          <i className="fas fa-plus me-2"></i> Ajouter votre premier produit
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

      <div className="products-footer">
        <div className="products-stats">
          <span>
            Total: <strong>{products.length}</strong>
          </span>
          <span>
            Affichés: <strong>{filteredProducts.length}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}

export default ProductsList
