import React from 'react'
import './StatCard.css' 

const StatCard = ({ title, value, description, icon, iconColor }) => {
  // Déterminer la classe d'icône basée sur le titre
  const getIconClass = (title) => {
    const titleLower = title.toLowerCase()
    if (titleLower.includes('lead')) return 'leads'
    if (titleLower.includes('opportunité')) return 'opportunities'
    if (titleLower.includes('devis')) return 'devis'
    if (titleLower.includes('projet')) return 'projects'
    if (titleLower.includes('commande') || titleLower.includes('po')) return 'orders'
    if (titleLower.includes('client')) return 'clients'
    return 'default'
  }

  const iconClass = getIconClass(title)

  return (
    <div className="stat-card-minimal">
      <div className={`stat-card-icon ${iconClass}`}>
        <i className={icon} style={{ color: iconColor }}></i>
      </div>
      <div className="stat-card-content-minimal">
        <div className="stat-card-title-minimal">{title}</div>
        <div className="stat-card-value-minimal">{value}</div>
        <div className="stat-card-description-minimal">{description}</div>
      </div>
    </div>
  )
}

export default StatCard
