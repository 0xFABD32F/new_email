import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../services/api";
import "./SuppliersStyles.css";

function SuppliersForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    company: "",
    domain: "",
    brand: "",
    country: "",
    address: "",
    position: "",
    contact_name: "",
    phone: "",
    email: "",
    currency: "USD",
    rib: "",
    payment_terms: "",
    reliability: "Moyenne",
  });

  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      const fetchSupplier = async () => {
        try {
          setLoading(true);
          const response = await API.get(`/suppliers/${id}`);
          setFormData(response.data);
          setError(null);
        } catch (err) {
          console.error("Erreur de chargement:", err);
          setError("Impossible de charger les données du fournisseur");
        } finally {
          setLoading(false);
        }
      };

      fetchSupplier();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      if (isEditing) {
        await API.put(`/suppliers/${id}`, formData);
      } else {
        await API.post("/suppliers/", formData);
      }
      
      navigate("/dashboard/suppliers");
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Une erreur est survenue lors de l'enregistrement");
      }
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="suppliers-loading">
        <div className="suppliers-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="suppliers-container">
      <div className="suppliers-header">
        <div>
          <h1>
            <i className={`fas ${isEditing ? "fa-edit" : "fa-plus-circle"} me-3`}></i>
            {isEditing ? "Modifier le fournisseur" : "Ajouter un fournisseur"}
          </h1>
          <p>{isEditing ? "Mettez à jour les informations" : "Remplissez le formulaire"}</p>
        </div>
        <button className="suppliers-btn suppliers-btn-secondary" onClick={() => navigate("/dashboard/suppliers")}>
          <i className="fas fa-arrow-left me-2"></i>
          Retour
        </button>
      </div>

      {error && (
        <div className="suppliers-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <div className="suppliers-card">
        <form onSubmit={handleSubmit} className="suppliers-form">
          <div className="form-grid">
            {/* Colonne 1 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-building me-2"></i>Informations de l'entreprise
                </h3>

                <div className="form-group">
                  <label htmlFor="company">Société <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <i className="fas fa-building"></i>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company || ""}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="domain">Domaine</label>
                  <div className="input-wrapper">
                    <i className="fas fa-industry"></i>
                    <select
                      id="domain"
                      name="domain"
                      value={formData.domain || ""}
                      onChange={handleChange}
                    >
                      <option value="">Sélectionner un domaine</option>
                      <option value="Hardware IT">Hardware IT</option>
                      <option value="Software IT">Software IT</option>
                      <option value="Networking">Networking</option>
                      <option value="Telco">Telco</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="Cloud">Cloud</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="brand">Marque</label>
                  <div className="input-wrapper">
                    <i className="fas fa-tag"></i>
                    <input
                      type="text"
                      id="brand"
                      name="brand"
                      value={formData.brand || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="country">Pays <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <i className="fas fa-globe"></i>
                    <select
                      id="country"
                      name="country"
                      value={formData.country || ""}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Sélectionner un pays</option>
                      <option value="Maroc">Maroc</option>
                      <option value="France">France</option>
                      <option value="UK">UK</option>
                      <option value="USA">USA</option>
                      <option value="UAE">UAE</option>
                      <option value="Espagne">Espagne</option>
                      <option value="Allemagne">Allemagne</option>
                      <option value="Egypt">Egypt</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="address">Adresse</label>
                  <div className="input-wrapper">
                    <i className="fas fa-map-marker-alt"></i>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address || ""}
                      onChange={handleChange}
                      rows="3"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne 2 */}
            <div className="form-column">
              <div className="form-section">
                <h3>
                  <i className="fas fa-user me-2"></i>Informations de contact
                </h3>

                <div className="form-group">
                  <label htmlFor="contact_name">Nom du contact <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <i className="fas fa-user"></i>
                    <input
                      type="text"
                      id="contact_name"
                      name="contact_name"
                      value={formData.contact_name || ""}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="position">Poste du contact</label>
                  <div className="input-wrapper">
                    <i className="fas fa-id-badge"></i>
                    <input
                      type="text"
                      id="position"
                      name="position"
                      value={formData.position || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <i className="fas fa-envelope"></i>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email || ""}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Téléphone</label>
                  <div className="input-wrapper">
                    <i className="fas fa-phone"></i>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>
                  <i className="fas fa-money-bill-wave me-2"></i>Informations financières
                </h3>

                <div className="form-group">
                  <label htmlFor="currency">Devise</label>
                  <div className="input-wrapper">
                    <i className="fas fa-dollar-sign"></i>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency || "USD"}
                      onChange={handleChange}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="MAD">MAD</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="payment_terms">Conditions de paiement</label>
                  <div className="input-wrapper">
                    <i className="fas fa-file-invoice-dollar"></i>
                    <input
                      type="text"
                      id="payment_terms"
                      name="payment_terms"
                      value={formData.payment_terms || ""}
                      onChange={handleChange}
                      placeholder="Ex: Net 30"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="rib">RIB/IBAN</label>
                  <div className="input-wrapper">
                    <i className="fas fa-university"></i>
                    <input
                      type="text"
                      id="rib"
                      name="rib"
                      value={formData.rib || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reliability">Fiabilité</label>
                  <div className="input-wrapper">
                    <i className="fas fa-star"></i>
                    <select
                      id="reliability"
                      name="reliability"
                      value={formData.reliability || "Moyenne"}
                      onChange={handleChange}
                    >
                      <option value="Élevée">Élevée</option>
                      <option value="Moyenne">Moyenne</option>
                      <option value="Faible">Faible</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="suppliers-btn suppliers-btn-secondary"
              onClick={() => navigate("/dashboard/suppliers")}
              disabled={saving}
            >
              <i className="fas fa-times me-2"></i>
              Annuler
            </button>
            <button type="submit" className="suppliers-btn suppliers-btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <div className="suppliers-spinner-sm"></div>
                  {isEditing ? "Mise à jour..." : "Création..."}
                </>
              ) : (
                <>
                  <i className={`fas ${isEditing ? "fa-save" : "fa-plus-circle"} me-2`}></i>
                  {isEditing ? "Mettre à jour" : "Créer le fournisseur"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SuppliersForm;