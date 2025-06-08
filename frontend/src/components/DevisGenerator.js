"use client"

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import "../pages/devis/PDFStyles.css"

const LOGO_PATHS = [
  "/assets/logo_oddnet.png",
  "/public/assets/logo_oddnet.png",
  "/static/logo_oddnet.png",
  "/logo_oddnet.png",
  "assets/logo_oddnet.png",
  "public/assets/logo_oddnet.png",
]

// Fonction pour essayer de charger le logo depuis plusieurs chemins
const loadLogoWithFallback = async () => {
  for (const path of LOGO_PATHS) {
    try {
      console.log(`Tentative de chargement du logo: ${path}`)
      const response = await fetch(path)
      if (response.ok) {
        const blob = await response.blob()
        console.log(`Logo trouvé avec succès: ${path}`)
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      }
    } catch (error) {
      console.warn(`Logo non trouvé à: ${path}`, error)
      continue
    }
  }

  console.warn("Aucun logo trouvé, utilisation du fallback")
  return null
}

// Fonction pour générer le PDF avec logo d'entreprise
export const generatePDF = async (devisData, logoPath = null) => {
  try {
    console.log("Génération du PDF avec logo d'entreprise:", devisData)
    console.log("Données shipping reçues:", devisData.shipping)
    console.log("Données shipping_info reçues:", devisData.shipping_info)

    const doc = new jsPDF("p", "mm", "a4")
    const pageWidth = doc.internal.pageSize.width // 210mm pour A4
    const pageHeight = doc.internal.pageSize.height

    // Couleurs exactes du template
    const oddnetBlue = [25, 55, 109]
    const white = [255, 255, 255]
    const black = [0, 0, 0]
    const lightGray = [248, 248, 248]

    doc.setFont("helvetica")

    // === LOGO EN HAUT À GAUCHE ===
    try {
      // Essayer d'abord le chemin fourni, sinon utiliser la fonction de fallback
      let logoBase64 = null

      if (logoPath) {
        try {
          const response = await fetch(logoPath)
          if (response.ok) {
            const blob = await response.blob()
            logoBase64 = await new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
          }
        } catch (error) {
          console.warn("Erreur avec le chemin fourni:", logoPath, error)
        }
      }

      // Si le chemin fourni n'a pas fonctionné, essayer les chemins de fallback
      if (!logoBase64) {
        logoBase64 = await loadLogoWithFallback()
      }

      if (logoBase64) {
        // Déterminer le format de l'image - PNG par défaut
        const imageFormat = logoBase64.includes("data:image/png")
          ? "PNG"
          : logoBase64.includes("data:image/jpeg") || logoBase64.includes("data:image/jpg")
            ? "JPEG"
            : logoBase64.includes("data:image/webp")
              ? "WEBP"
              : "PNG" // Par défaut PNG

        console.log(`Ajout du logo au PDF (format: ${imageFormat})`)
        doc.addImage(logoBase64, imageFormat, 15, 15, 45, 22)
      } else {
        throw new Error("Logo non trouvé")
      }
    } catch (error) {
      console.warn("Erreur lors du chargement du logo, utilisation du fallback:", error)

      // Fallback logo stylisé avec design amélioré
      doc.setFillColor(...oddnetBlue)
      doc.roundedRect(15, 15, 45, 22, 2, 2, "F")

      // Bordure subtile
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.roundedRect(15, 15, 45, 22, 2, 2, "D")

      // Texte principal
      doc.setTextColor(...white)
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("ODDnet", 18, 26)

      // Tagline
      doc.setFontSize(6)
      doc.setFont("helvetica", "normal")
      doc.text("ALWAYS A STEP AHEAD", 18, 32)
    }

    // === INFORMATIONS ENTREPRISE SOUS LE LOGO ===
    doc.setTextColor(...black)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text("Technopark, B4-10-11-12, Casablanca, 25150, Morocco", 15, 45)
    doc.text("Phone: +212 664906775", 15, 50)
    doc.text("sales@odd-net.com", 15, 55)

    // === SECTION QUOTE SIMPLIFIÉE (DROITE) ===
    const quoteX = 115
    const quoteY = 15
    const quoteWidth = 80
    const quoteHeight = 75

    // Cadre principal
    doc.setDrawColor(...black)
    doc.setLineWidth(0.5)
    doc.rect(quoteX, quoteY, quoteWidth, quoteHeight, "D")

    // En-tête Quote
    doc.setFillColor(...oddnetBlue)
    doc.rect(quoteX, quoteY, quoteWidth, 8, "F")
    doc.setTextColor(...white)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("Quote", quoteX + 35, quoteY + 6)

    // === TABLEAU SIMPLIFIÉ DES INFORMATIONS DE BASE ===
    const quoteNumber = devisData.devis_number || devisData.reference || `DEV-${format(new Date(), "yyyy-MM-dd")}`
    const quoteDate = format(new Date(devisData.date_creation || new Date()), "M/d/yyyy")
    const clientCompany = devisData.company_name || "Client"

    // Tableau simplifié - seulement No, Date, Client
    const quoteTableData = [
      ["No:", quoteNumber],
      ["Date:", quoteDate],
      ["Client:", clientCompany],
    ]

    autoTable(doc, {
      startY: quoteY + 10,
      body: quoteTableData,
      tableWidth: quoteWidth - 4,
      margin: { left: quoteX + 2 },
      theme: "plain",
      bodyStyles: {
        fontSize: 8,
        cellPadding: 1.5,
        textColor: black,
        lineWidth: 0,
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: "bold" },
        1: { cellWidth: 50 },
      },
    })

    // === SECTION CLIENT INFORMATION ===
    let clientInfoY = quoteY + 30

    // Titre "Client Information:"
    doc.setTextColor(...black)
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.text("Client Information:", quoteX + 2, clientInfoY)
    clientInfoY += 5

    // Détails du client en format structuré
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)

    // Nom du contact
    if (devisData.contact_name) {
      doc.text(devisData.contact_name, quoteX + 2, clientInfoY)
      clientInfoY += 3
    }

    // Position
    if (devisData.contact_position) {
      doc.text(`Position: ${devisData.contact_position}`, quoteX + 2, clientInfoY)
      clientInfoY += 3
    }

    // Téléphone
    if (devisData.phone) {
      doc.text(`TEL: ${devisData.phone}`, quoteX + 2, clientInfoY)
      clientInfoY += 3
    }

    // Email
    if (devisData.email) {
      doc.text(`Email: ${devisData.email}`, quoteX + 2, clientInfoY)
      clientInfoY += 3
    }

    // Pays
    if (devisData.country) {
      doc.text(`Country: ${devisData.country}`, quoteX + 2, clientInfoY)
    }

    // === SECTION NOTES SPÉCIALES ===
    const notesY = 100
    doc.setFillColor(...oddnetBlue)
    doc.rect(15, notesY, 180, 8, "F")
    doc.setTextColor(...white)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Quote Order Special Notes and Instructions", 17, notesY + 6)

    // Contenu des notes dynamiques
    doc.setTextColor(...black)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    const currency = devisData.currency || "USD"
    const deliveryTime = devisData.eta || devisData.delivery_time || "4-6 Weeks"
    const deliveryLocation = devisData.country || devisData.delivery_location || "Destination"

    let notesContentY = notesY + 12
    doc.text(`1- Unit Prices are in ${currency}, excluding taxes.`, 17, notesContentY)
    notesContentY += 4
    doc.text("2- Payment Terms: 100% Net 30 Days upon material delivery and invoice submission.", 17, notesContentY)
    notesContentY += 4
    doc.text(`3- Delivery Terms: ${deliveryTime} DDP ${deliveryLocation}.`, 17, notesContentY)
    notesContentY += 4
    doc.text("4- Warranty Terms: Standard manufacturer warranty", 17, notesContentY)

    // Notes supplémentaires si disponibles
    if (devisData.notes || devisData.special_instructions) {
      notesContentY += 4
      const additionalNotes = devisData.notes || devisData.special_instructions
      const noteLines = doc.splitTextToSize(`5- Additional Notes: ${additionalNotes}`, 175)
      doc.text(noteLines, 17, notesContentY)
      notesContentY += noteLines.length * 4
    }

    // === TABLEAU PRINCIPAL DES PRODUITS ===
    const tableStartY = notesContentY + 10

    // Préparer les données du tableau
    let tableData = []

    if (devisData.items && Array.isArray(devisData.items) && devisData.items.length > 0) {
      tableData = devisData.items.map((item, index) => [
        `#${String(index + 1).padStart(2, "0")}`,
        item.pn || item.part_number || "",
        item.eq_reference || item.description || "",
        (item.qty || item.quantity || 0).toString(),
        currency === "USD" ? "$" : currency,
        item.unit_price ? Number.parseFloat(item.unit_price).toFixed(2) : "-",
        item.total_price ? Number.parseFloat(item.total_price).toFixed(2) : "-",
      ])
    } else {
      // Message si pas d'items
      tableData = [
        ["#01", "N/A", "No items specified in this quote", "1", currency === "USD" ? "$" : currency, "0.00", "0.00"],
      ]
    }

    // Générer le tableau principal
    autoTable(doc, {
      startY: tableStartY,
      head: [["Reference", "Part Number", "Description", "Quantity", "Unit", "Unit price", "Total Price"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: oddnetBlue,
        textColor: white,
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 1.5,
        valign: "middle",
        textColor: black,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 18 }, // Reference
        1: { halign: "left", cellWidth: 28 }, // Part Number
        2: { halign: "left", cellWidth: 75 }, // Description
        3: { halign: "center", cellWidth: 18 }, // Quantity
        4: { halign: "center", cellWidth: 12 }, // Unit
        5: { halign: "right", cellWidth: 22 }, // Unit price
        6: { halign: "right", cellWidth: 22 }, // Total Price
      },
      margin: { left: 15, right: 15 },
      alternateRowStyles: {
        fillColor: lightGray,
      },
      didParseCell: (data) => {
        data.cell.styles.lineColor = [200, 200, 200]
        data.cell.styles.lineWidth = 0.1
      },
    })

    // === CALCULS DES TOTAUX SIMPLIFIÉS ===
    console.log("=== CALCULS TOTAUX PDF SIMPLIFIÉS ===")

    // Calcul du sous-total des produits
    const subtotal =
      devisData.items && Array.isArray(devisData.items) && devisData.items.length > 0
        ? devisData.items.reduce((sum, item) => {
            const itemTotal = Number.parseFloat(item.total_price || 0)
            return sum + (isNaN(itemTotal) ? 0 : itemTotal)
          }, 0)
        : Number.parseFloat(devisData.total_amount || 0)

    console.log("Sous-total produits:", subtotal)

    // CORRECTION FINALE: Récupération prioritaire des frais de shipping
    let shippingCost = 0

    // Vérifier d'abord si shipping_cost existe directement dans devisData
    if (devisData.shipping_cost && devisData.shipping_cost > 0) {
      shippingCost = Number.parseFloat(devisData.shipping_cost)
      console.log("Frais shipping (direct devisData):", shippingCost)
    }
    // Ensuite vérifier shipping_info
    else if (devisData.shipping_info && devisData.shipping_info.enabled && devisData.shipping_info.shipping_cost > 0) {
      shippingCost = Number.parseFloat(devisData.shipping_info.shipping_cost)
      console.log("Frais shipping (shipping_info):", shippingCost)
    }
    // Ensuite vérifier shipping
    else if (devisData.shipping && devisData.shipping.enabled && devisData.shipping.shipping_cost > 0) {
      shippingCost = Number.parseFloat(devisData.shipping.shipping_cost)
      console.log("Frais shipping (shipping):", shippingCost)
    }

    console.log("Frais de shipping final:", shippingCost)

    // Calcul des taxes (TVA) - SEULEMENT sur les produits
    const tvaRate = Number.parseFloat(devisData.tva || 20) / 100
    const tvaAmount = subtotal * tvaRate
    console.log("TVA (20%):", tvaAmount)

    // CORRECTION: Handling Cost = Frais de shipping + TVA (TOTAL SIMPLE)
    const handlingCost = shippingCost + tvaAmount
    console.log("Handling Cost TOTAL (shipping + TVA):", handlingCost)

    // Total final
    const totalFinal = subtotal + handlingCost
    console.log("Total final:", totalFinal)

    // === SECTION TOTAUX SIMPLIFIÉE (BAS DROITE) ===
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : tableStartY + 100
    const totalsY = Math.max(finalY, pageHeight - 80)

    // Calcul précis pour que le tableau soit visible
    const totalsWidth = 80 // Largeur réduite mais suffisante
    const totalsX = pageWidth - totalsWidth - 15 // 15mm de marge droite

    const currencySymbol = currency === "USD" ? "$" : currency

    // CORRECTION: Tableau simplifié - SEULEMENT 3 LIGNES
    const totalsData = [
      [
        "SubTotal - EXW :",
        currencySymbol,
        subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ],
      [
        `Handling Cost (International Transit, Customs Duties, Local Taxes...)`,
        currencySymbol,
        handlingCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ],
      [
        `Total DDP-${(deliveryLocation).toUpperCase()}:`,
        currencySymbol,
        totalFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ],
    ]

    autoTable(doc, {
      startY: totalsY,
      body: totalsData,
      theme: "grid",
      tableWidth: totalsWidth,
      margin: { left: totalsX },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
        fillColor: oddnetBlue,
        textColor: white,
        fontStyle: "bold",
        valign: "middle",
        lineColor: black,
        lineWidth: 0.5,
        minCellHeight: 7,
      },
      columnStyles: {
        0: {
          halign: "left",
          cellWidth: 45,
          fontSize: 8,
        },
        1: {
          halign: "center",
          cellWidth: 12,
          fontSize: 9,
        },
        2: {
          halign: "right",
          cellWidth: 23,
          fontSize: 9,
          fontStyle: "bold",
        },
      },
      didParseCell: (data) => {
        // Style spécial pour la ligne totale (dernière ligne)
        if (data.row.index === totalsData.length - 1) {
          data.cell.styles.fontSize = 10
          data.cell.styles.fontStyle = "bold"
          data.cell.styles.minCellHeight = 8
        }

        // Assurer que le texte ne déborde pas
        data.cell.styles.overflow = "linebreak"
      },
    })

    // === PIED DE PAGE ===
    const footerY = pageHeight - 15
    doc.setFillColor(240, 240, 240)
    doc.rect(0, footerY, pageWidth, 15, "F")

    doc.setTextColor(...black)
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.text("ODDnet SARL, Technopark Casablanca, Maroc – https://odd-net.com", 15, footerY + 5)
    doc.text("ICE:002583055000030 RC: 469051 TP: 34005331 IF: 45913859 CNSS: 2109239", 15, footerY + 9)
    doc.text("Tel: +212661045894 Email: sales@odd-net.com", 15, footerY + 13)

    // Numéro de page
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setTextColor(...black)
      doc.setFontSize(7)
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 25, footerY + 13)
    }

    // Sauvegarder avec nom dynamique
    const fileName = `Quote_${quoteNumber}_${clientCompany.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`
    doc.save(fileName)

    console.log("PDF généré avec succès:", fileName)
    console.log("=== FIN CALCULS TOTAUX PDF ===")
    return fileName
  } catch (error) {
    console.error("Erreur génération PDF:", error)
    throw new Error("Erreur lors de la génération du PDF: " + error.message)
  }
}

// Fonction helper pour charger les images (gardée pour compatibilité)
const loadImageAsBase64 = async (imagePath) => {
  try {
    const response = await fetch(imagePath)
    if (!response.ok) throw new Error("Image non trouvée")

    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.warn("Impossible de charger l'image:", error)
    return null
  }
}

// Composant React
const DevisGenerator = ({ devisData, onGenerate, logoPath }) => {
  const handleGeneratePDF = async () => {
    try {
      console.log("Début génération PDF avec logo d'entreprise")
      console.log("Données devis reçues:", devisData)

      // Utiliser le chemin correct pour le logo PNG
      const correctLogoPath = logoPath || "/assets/logo_oddnet.png"
      const fileName = await generatePDF(devisData, correctLogoPath)
      console.log("PDF généré:", fileName)

      if (onGenerate) {
        onGenerate(fileName)
      }

      return fileName
    } catch (error) {
      console.error("Erreur génération PDF:", error)
      alert("Erreur lors de la génération du PDF: " + error.message)
    }
  }

  return (
    <div className="pdf-generator-container">
      <button className="pdf-generator-btn" onClick={handleGeneratePDF} type="button" title="Générer un PDF du devis">
        <i className="fas fa-file-pdf"></i>
        Générer PDF
      </button>
    </div>
  )
}

export default DevisGenerator
