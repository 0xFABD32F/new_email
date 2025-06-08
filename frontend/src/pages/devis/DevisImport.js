"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import API from "../../services/api"
import "./DevisStyles.css"

function DevisImportForm() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState("")
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)
  const [previewData, setPreviewData] = useState(null)
  const [fileType, setFileType] = useState("excel")
  const [showTypeSelection, setShowTypeSelection] = useState(true)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await API.get("/clients/")
      setClients(response.data)
    } catch (err) {
      console.error("Erreur lors du chargement des clients:", err)
      setMessage("Erreur lors du chargement des clients")
    }
  }

  useEffect(() => {
    setFile(null)
    setMessage("")
    setPreviewData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [fileType])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      const fileExtension = selectedFile.name.toLowerCase().split(".").pop()

      if (fileType === "excel" && (fileExtension === "xlsx" || fileExtension === "xls")) {
        setFile(selectedFile)
        setMessage("")
        setPreviewData(null)
      } else if (fileType === "pdf" && fileExtension === "pdf") {
        setFile(selectedFile)
        setMessage("")
        setPreviewData(null)
      } else {
        setFile(null)
        setMessage(`Veuillez sélectionner un fichier ${fileType === "excel" ? "Excel (.xlsx ou .xls)" : "PDF (.pdf)"}`)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }
  }

  const handlePreview = async () => {
    if (!file) return
    setLoading(true)
    setMessage("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await API.post("/hardware/preview-file/", formData, {
        headers: {
          Accept: "application/json",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setProgress(percentCompleted)
        },
      })

      setPreviewData(response.data)
      setMessage("Aperçu généré avec succès. Vérifiez les données avant l'importation.")
    } catch (err) {
      console.error("Erreur lors de la prévisualisation:", err)
      let errorMessage = "Erreur inconnue lors de la prévisualisation"
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      }
      setMessage(`Erreur: ${errorMessage}`)
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const handleImportToDevis = async () => {
    if (!file || !selectedClient) {
      setMessage("Veuillez sélectionner un client et un fichier")
      return
    }

    setLoading(true)
    setMessage("")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("client_id", selectedClient)

    try {
      const response = await API.post("/hardware/import-to-devis/", formData, {
        headers: {
          Accept: "application/json",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setProgress(percentCompleted)
        },
      })

      setMessage(response.data.message || "Devis créé avec succès")

      // Rediriger vers le devis créé après un court délai
      setTimeout(() => {
        navigate(`/dashboard/devis/edit/${response.data.devis_id}`)
      }, 2000)
    } catch (err) {
      console.error("Erreur lors de l'importation:", err)
      let errorMessage = "Erreur inconnue lors de l'importation"
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      }
      setMessage(`Erreur: ${errorMessage}`)
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await API.get("/devis/template/download", {
        responseType: "blob",
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", "Modele_Devis_Import.xlsx")
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Erreur lors du téléchargement du modèle:", err)
      setMessage("Erreur lors du téléchargement du modèle")
    }
  }

  const selectFileType = (type) => {
    setFileType(type)
    setShowTypeSelection(false)
  }

  const backToTypeSelection = () => {
    setShowTypeSelection(true)
    setFile(null)
    setMessage("")
    setPreviewData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="devis-container">
      <div className="devis-header">
        <div>
          <h1>
            <i className="fas fa-file-import me-3"></i>
            Créer un devis depuis un fichier
          </h1>
          <p>Importez un fichier Excel ou PDF pour créer automatiquement un devis.</p>
        </div>
        <div className="devis-header-actions">
          <button className="devis-btn devis-btn-secondary" onClick={downloadTemplate}>
            <i className="fas fa-download me-2"></i>
            Télécharger le modèle
          </button>
          <button className="devis-btn devis-btn-secondary" onClick={() => navigate("/dashboard/devis")}>
            <i className="fas fa-arrow-left me-2"></i>
            Retour
          </button>
        </div>
      </div>

      <div className="devis-card">
        {showTypeSelection ? (
          <div className="devis-form">
            <div className="form-section">
              <h3>
                <i className="fas fa-file me-2"></i>
                Choisir le type de fichier
              </h3>

              <div className="file-type-selection">
                <div className="file-type-option" onClick={() => selectFileType("excel")}>
                  <div className="file-type-icon">
                    <i className="fas fa-file-excel"></i>
                  </div>
                  <h4>Excel</h4>
                  <p>Importer un fichier Excel (.xlsx, .xls)</p>
                </div>

                <div className="file-type-option" onClick={() => selectFileType("pdf")}>
                  <div className="file-type-icon">
                    <i className="fas fa-file-pdf"></i>
                  </div>
                  <h4>PDF</h4>
                  <p>Importer un fichier PDF (.pdf)</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="devis-form">
            <div className="form-section">
              <h3>
                <i className={`fas ${fileType === "excel" ? "fa-file-excel" : "fa-file-pdf"} me-2`}></i>
                Création de devis depuis {fileType === "excel" ? "Excel" : "PDF"}
                <button
                  className="devis-btn devis-btn-sm devis-btn-outline file-type-back"
                  onClick={backToTypeSelection}
                >
                  <i className="fas fa-exchange-alt me-1"></i>
                  Changer de type
                </button>
              </h3>

              <div className="form-group">
                <label htmlFor="client_id">
                  Client <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <i className="fas fa-building"></i>
                  <select
                    id="client_id"
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    required
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="file-upload-container">
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept={fileType === "excel" ? ".xlsx, .xls" : ".pdf"}
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="file-input"
                  />
                  <div className="file-input-label">
                    <i className={`fas ${fileType === "excel" ? "fa-file-excel" : "fa-file-pdf"}`}></i>
                    <span>{file ? file.name : `Choisir un fichier ${fileType === "excel" ? "Excel" : "PDF"}`}</span>
                  </div>
                </div>

                <div className="file-actions">
                  <button onClick={handlePreview} className="devis-btn devis-btn-secondary" disabled={loading || !file}>
                    <i className="fas fa-eye me-2"></i>
                    Aperçu
                  </button>

                  <button
                    onClick={handleImportToDevis}
                    className="devis-btn devis-btn-primary"
                    disabled={loading || !file || !selectedClient}
                  >
                    {loading ? (
                      <>
                        <div className="devis-spinner-sm"></div>
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-file-invoice-dollar me-2"></i>
                        Créer le devis
                      </>
                    )}
                  </button>
                </div>
              </div>

              {loading && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="progress-text">{progress}%</div>
                </div>
              )}

              {message && (
                <div className={`message ${message.includes("Erreur") ? "error" : "success"}`}>
                  <i className={`fas ${message.includes("Erreur") ? "fa-exclamation-circle" : "fa-check-circle"}`}></i>
                  {message}
                </div>
              )}
            </div>

            {previewData && (
              <div className="form-section">
                <h3>
                  <i className="fas fa-table me-2"></i>
                  Aperçu des données
                </h3>

                <div className="preview-info">
                  <div className="preview-header">
                    <div>
                      <strong>Devis N°:</strong> {previewData.devis_number || "Auto-généré"}
                    </div>
                    <div>
                      <strong>Client:</strong>{" "}
                      {clients.find((c) => c.id == selectedClient)?.company_name || "Non sélectionné"}
                    </div>
                    <div>
                      <strong>Nombre d'articles:</strong> {previewData.items?.length || 0}
                    </div>
                  </div>
                </div>

                <div className="preview-table-container">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Marque</th>
                        <th>Fournisseur</th>
                        <th>PN</th>
                        <th>Description</th>
                        <th>Qté</th>
                        <th>Prix unitaire</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.items && previewData.items.length > 0 ? (
                        previewData.items.map((item, index) => (
                          <tr key={index}>
                            <td>{item.brand}</td>
                            <td>{item.supplier}</td>
                            <td>{item.pn}</td>
                            <td>{item.eq_reference}</td>
                            <td>{item.qty}</td>
                            <td>
                              {item.unit_cost} {item.currency}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="no-data">
                            Aucune donnée disponible
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="form-section">
              <h3>
                <i className="fas fa-info-circle me-2"></i>
                Instructions
              </h3>

              <div className="instructions">
                <ol>
                  <li>Sélectionnez un client existant dans la liste</li>
                  <li>
                    Choisissez un fichier {fileType === "excel" ? "Excel (.xlsx ou .xls)" : "PDF (.pdf)"} contenant des
                    données d'équipement
                  </li>
                  <li>Cliquez sur "Aperçu" pour vérifier les données avant l'importation</li>
                  <li>Cliquez sur "Créer le devis" pour générer automatiquement le devis</li>
                </ol>

                <div className="note">
                  <i className="fas fa-lightbulb"></i>
                  <p>
                    Le système créera automatiquement un devis avec les informations du client sélectionné et les
                    produits importés du fichier. Vous pourrez ensuite modifier le devis et calculer les frais de
                    transport si nécessaire.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DevisImportForm
