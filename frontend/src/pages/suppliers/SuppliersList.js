import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";
import "./SuppliersStyles.css";

function SuppliersList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterReliability, setFilterReliability] = useState("");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await API.get("/suppliers/");
      setSuppliers(response.data);
      setError(null);
    } catch (err) {
      console.error("Erreur de chargement des fournisseurs:", err);
      setError("Erreur lors du chargement des fournisseurs");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) {
      try {
        await API.delete(`/suppliers/${id}`);
        setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id));
      } catch (err) {
        console.error("Erreur lors de la suppression:", err);
        if (err.response && err.response.data && err.response.data.detail) {
          setError(err.response.data.detail);
        } else {
          setError("Erreur lors de la suppression du fournisseur");
        }
      }
    }
  };

  const getReliabilityBadgeClass = (reliability) => {
    switch (reliability) {
      case "High":
      case "Élevée":
        return "badge-success";
      case "Medium":
      case "Moyenne":
        return "badge-warning";
      case "Low":
      case "Faible":
        return "badge-danger";
      default:
        return "badge-secondary";
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      !searchTerm ||
      Object.values(supplier).some(
        (value) => value && typeof value === "string" && value.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesDomain = !filterDomain || (supplier.domain && supplier.domain === filterDomain);
    const matchesCountry = !filterCountry || (supplier.country && supplier.country === filterCountry);
    const matchesReliability = !filterReliability || (supplier.reliability && supplier.reliability === filterReliability);

    return matchesSearch && matchesDomain && matchesCountry && matchesReliability;
  });

  // Obtenir les valeurs uniques pour les filtres
  const uniqueDomains = [...new Set(suppliers.map((supplier) => supplier.domain).filter(Boolean))];
  const uniqueCountries = [...new Set(suppliers.map((supplier) => supplier.country).filter(Boolean))];
  const uniqueReliabilities = [...new Set(suppliers.map((supplier) => supplier.reliability).filter(Boolean))];

  if (loading) {
    return (
      <div className="suppliers-loading">
        <div className="suppliers-spinner"></div>
        <p>Chargement des fournisseurs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="suppliers-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Une erreur est survenue</h3>
        <p>{error}</p>
        <button onClick={fetchSuppliers} className="suppliers-btn suppliers-btn-primary">
          <i className="fas fa-sync-alt me-2"></i>Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="suppliers-container">
      <div className="suppliers-header">
        <div>
          <h1>
            <i className="fas fa-truck me-3"></i>Gestion des Fournisseurs
          </h1>
          <p>Gérez vos fournisseurs et leurs informations</p>
        </div>
        <Link to="/dashboard/suppliers/new" className="suppliers-btn suppliers-btn-primary">
          <i className="fas fa-plus me-2"></i> Ajouter un fournisseur
        </Link>
      </div>

      {error && (
        <div className="suppliers-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <div className="suppliers-filters">
        <div className="suppliers-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} className="suppliers-select">
          <option value="">Tous les domaines</option>
          {uniqueDomains.map((domain) => (
            <option key={domain} value={domain}>
              {domain}
            </option>
          ))}
        </select>

        <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="suppliers-select">
          <option value="">Tous les pays</option>
          {uniqueCountries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>

        <select value={filterReliability} onChange={(e) => setFilterReliability(e.target.value)} className="suppliers-select">
          <option value="">Toutes fiabilités</option>
          {uniqueReliabilities.map((reliability) => (
            <option key={reliability} value={reliability}>
              {reliability}
            </option>
          ))}
        </select>

        <button className="suppliers-btn-icon" onClick={fetchSuppliers} title="Rafraîchir">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      <div className="suppliers-card">
        <div className="suppliers-table-container">
          <table>
            <thead>
              <tr>
                <th>Société</th>
                <th>Domaine</th>
                <th>Marque</th>
                <th>Pays</th>
                <th>Contact</th>
                <th>Email / Téléphone</th>
                <th>Devise</th>
                <th>Conditions</th>
                <th>Fiabilité</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="suppliers-bold">{supplier.company}</td>
                    <td>{supplier.domain || "-"}</td>
                    <td>{supplier.brand || "-"}</td>
                    <td>{supplier.country || "-"}</td>
                    <td>
                      <div>{supplier.contact_name || "-"}</div>
                      {supplier.position && <div className="suppliers-small">{supplier.position}</div>}
                    </td>
                    <td>
                      {supplier.email && (
                        <div>
                          <a href={`mailto:${supplier.email}`} className="suppliers-link">
                            {supplier.email}
                          </a>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="suppliers-small">
                          <a href={`tel:${supplier.phone}`} className="suppliers-link">
                            {supplier.phone}
                          </a>
                        </div>
                      )}
                    </td>
                    <td>{supplier.currency || "USD"}</td>
                    <td>{supplier.payment_terms || "-"}</td>
                    <td>
                      <span className={`suppliers-badge ${getReliabilityBadgeClass(supplier.reliability)}`}>
                        {supplier.reliability || "Non définie"}
                      </span>
                    </td>
                    <td>
                      <div className="suppliers-actions">
                        <Link
                          to={`/dashboard/suppliers/edit/${supplier.id}`}
                          className="suppliers-btn-action suppliers-edit"
                          title="Modifier"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button
                          className="suppliers-btn-action suppliers-delete"
                          onClick={() => handleDelete(supplier.id)}
                          title="Supprimer"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                        <Link
                          to={`/dashboard/suppliers/${supplier.id}/products`}
                          className="suppliers-btn-action suppliers-view"
                          title="Voir les produits"
                        >
                          <i className="fas fa-box"></i>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="suppliers-empty">
                    <div>
                      <i className="fas fa-search"></i>
                      <h3>Aucun fournisseur trouvé</h3>
                      <p>Aucun fournisseur ne correspond à vos critères ou aucun fournisseur n'a été créé.</p>
                      {searchTerm || filterDomain || filterCountry || filterReliability ? (
                        <button
                          className="suppliers-btn suppliers-btn-secondary"
                          onClick={() => {
                            setSearchTerm("");
                            setFilterDomain("");
                            setFilterCountry("");
                            setFilterReliability("");
                          }}
                        >
                          Effacer les filtres
                        </button>
                      ) : (
                        <Link to="/dashboard/suppliers/new" className="suppliers-btn suppliers-btn-primary">
                          <i className="fas fa-plus me-2"></i> Ajouter votre premier fournisseur
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

      <div className="suppliers-footer">
        <div className="suppliers-stats">
          <span>
            Total: <strong>{suppliers.length}</strong>
          </span>
          <span>
            Affichés: <strong>{filteredSuppliers.length}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

export default SuppliersList;