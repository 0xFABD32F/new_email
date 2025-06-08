"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../../services/api"
import "./HardwareStyles.css"

function HardwareExcel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hardware, setHardware] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Récupérer les détails du hardware
        const hardwareResponse = await API.get(`/hardware/${id}`)
        setHardware(hardwareResponse.data)

        // Générer le fichier Excel
        const excelResponse = await API.get(`/hardware/generate-excel/${id}`)
        if (excelResponse.data && excelResponse.data.download_url) {
          setDownloadUrl(excelResponse.data.download_url)

          // Rediriger vers le téléchargement en utilisant l'URL complète de l'API
          // Utiliser une URL absolue pour éviter les problèmes de routage
          window.location.href = `${API.baseURL}${excelResponse.data.download_url}`
        }

        setError(null)
      } catch (err) {
        console.error("Erreur lors de la génération du fichier Excel:", err)
        setError("Impossible de générer le fichier Excel. Veuillez réessayer.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleReturnToList = () => {
    navigate("/dashboard/hardware")
  }

  const handleDownloadAgain = (e) => {
    e.preventDefault()
    // Utiliser une URL absolue pour le téléchargement
    window.location.href = `${API.baseURL}${downloadUrl}`
  }

  if (loading) {
    return (
      <div className="hw-loading">
        <div className="hw-spinner"></div>
        <p>Génération du fichier Excel en cours...</p>
      </div>
    )
  }

  return (
    <div className="hw-container">
      <div className="hw-header">
        <div>
          <h1>
            <i className="fas fa-file-excel me-3"></i>
            Génération du fichier Excel
          </h1>
          <p>Équipement: {hardware?.eq_reference || "N/A"}</p>
        </div>
        <button className="hw-btn hw-btn-secondary" onClick={handleReturnToList}>
          <i className="fas fa-arrow-left me-2"></i>
          Retour à la liste
        </button>
      </div>

      {error ? (
        <div className="hw-error-message">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      ) : (
        <div className="hw-card">
          <div className="hw-excel-success">
            <i className="fas fa-check-circle"></i>
            <h3>Fichier Excel généré avec succès</h3>
            <p>Le téléchargement devrait démarrer automatiquement.</p>

            {downloadUrl && (
              <button onClick={handleDownloadAgain} className="hw-btn hw-btn-primary">
                <i className="fas fa-download me-2"></i>
                Télécharger à nouveau
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default HardwareExcel
