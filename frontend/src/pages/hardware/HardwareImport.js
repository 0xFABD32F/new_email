"use client"

import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import API from "../../services/api"
import "./HardwareStyles.css"

function HardwareImport() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)
  const [previewData, setPreviewData] = useState(null)
  const [fileType, setFileType] = useState("excel") // "excel" ou "pdf"
  const [showTypeSelection, setShowTypeSelection] = useState(true) // Afficher la sélection de type de fichier

  // Réinitialiser le formulaire lorsque le type de fichier change
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
      console.log("Envoi du fichier pour aperçu:", file.name, file.type, file.size)

      // Utiliser l'endpoint générique pour les deux types de fichiers
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

        if (errorMessage.includes("openpyxl")) {
          errorMessage =
            "Le serveur ne peut pas lire le fichier Excel. La bibliothèque openpyxl n'est pas installée. Contactez l'administrateur."
        } else if (errorMessage.includes("PyPDF2") || errorMessage.includes("tabula")) {
          errorMessage =
            "Le serveur ne peut pas lire le fichier PDF. Les bibliothèques nécessaires ne sont pas installées. Contactez l'administrateur."
        }
      }

      setMessage(`Erreur: ${errorMessage}`)
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setMessage("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      console.log("Envoi du fichier pour importation:", file.name, file.type, file.size)

      for (const pair of formData.entries()) {
        console.log(pair[0] + ": " + pair[1].name)
      }

      // Utiliser l'endpoint générique pour les deux types de fichiers
      const response = await API.post("/hardware/import-file/", formData, {
        headers: {
          Accept: "application/json",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setProgress(percentCompleted)
        },
      })

      setMessage(response.data.message || "Importation réussie")

      // Rediriger vers la liste des équipements après un court délai
      setTimeout(() => {
        navigate("/dashboard/hardware")
      }, 2000)
    } catch (err) {
      console.error("Erreur lors de l'importation:", err)

      let errorMessage = "Erreur inconnue lors de l'importation"

      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail

        if (errorMessage.includes("openpyxl")) {
          errorMessage =
            "Le serveur ne peut pas lire le fichier Excel. La bibliothèque openpyxl n'est pas installée. Contactez l'administrateur."
        } else if (errorMessage.includes("PyPDF2") || errorMessage.includes("tabula")) {
          errorMessage =
            "Le serveur ne peut pas lire le fichier PDF. Les bibliothèques nécessaires ne sont pas installées. Contactez l'administrateur."
        } else if (errorMessage.includes("Aucun équipement trouvé")) {
          errorMessage =
            "Aucun équipement n'a été trouvé dans le fichier. Vérifiez que le format du fichier est correct et qu'il contient des données d'équipement."
        }
      }

      setMessage(`Erreur: ${errorMessage}`)
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  // Fonction pour sélectionner le type de fichier
  const selectFileType = (type) => {
    setFileType(type)
    setShowTypeSelection(false)
  }

  // Revenir à la sélection du type de fichier
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
    <div className="hw-container">
      <div className="hw-header">
        <div>
          <h1>
            <i className="fas fa-file-import me-3"></i>
            Importer un devis
          </h1>
          <p>Sélectionnez un fichier Excel ou PDF pour créer un devis et des équipements.</p>
        </div>
        <button className="hw-btn hw-btn-secondary" onClick={() => navigate("/dashboard/hardware")}>
          <i className="fas fa-arrow-left me-2"></i>
          Retour
        </button>
      </div>

      <div className="hw-card">
        {showTypeSelection ? (
          <div className="hw-form">
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
          <div className="hw-form">
            <div className="form-section">
              <h3>
                <i className={`fas ${fileType === "excel" ? "fa-file-excel" : "fa-file-pdf"} me-2`}></i>
                Sélection du fichier {fileType === "excel" ? "Excel" : "PDF"}
                <button className="hw-btn hw-btn-sm hw-btn-outline file-type-back" onClick={backToTypeSelection}>
                  <i className="fas fa-exchange-alt me-1"></i>
                  Changer de type
                </button>
              </h3>

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
                  <button onClick={handlePreview} className="hw-btn hw-btn-secondary" disabled={loading || !file}>
                    <i className="fas fa-eye me-2"></i>
                    Aperçu
                  </button>

                  <button onClick={handleUpload} className="hw-btn hw-btn-primary" disabled={loading || !file}>
                    {loading ? (
                      <>
                        <div className="hw-spinner-sm"></div>
                        Importation en cours...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-file-import me-2"></i>
                        Importer
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
                      <strong>Client:</strong> {previewData.client || "Non spécifié"}
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
                  <li>
                    Sélectionnez un fichier {fileType === "excel" ? "Excel (.xlsx ou .xls)" : "PDF (.pdf)"} contenant
                    des données d'équipement
                  </li>
                  <li>Cliquez sur "Aperçu" pour vérifier les données avant l'importation</li>
                  <li>Cliquez sur "Importer" pour créer le devis et les équipements</li>
                </ol>

                <div className="note">
                  <i className="fas fa-lightbulb"></i>
                  <p>
                    Le système tentera d'extraire automatiquement les informations importantes comme les références, les
                    descriptions, les quantités et les prix. Pour de meilleurs résultats, utilisez un fichier avec des
                    tableaux bien structurés.
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

export default HardwareImport
