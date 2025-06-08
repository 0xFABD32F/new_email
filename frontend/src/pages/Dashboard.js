import React, { useState, useEffect } from 'react'
import BarChart from '../components/chats/BarChart'
import LineChart from '../components/chats/LineChart'
import PieChart from '../components/chats/PieChart'
import OpportunityTimelineChart from '../components/chats/OpportunityTimelineChart'
import StatCard from '../components/ui/StatCard'
import API from '../services/api'
import './DashboardStyles.css'

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [timelineData, setTimelineData] = useState(null)
  const [revenueData, setRevenueData] = useState(null)
  const [clientsData, setClientsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Récupérer toutes les données en parallèle
      const [statsResponse, timelineResponse, revenueResponse, clientsResponse] = await Promise.all([
        API.get('/dashboard/stats'),
        API.get('/dashboard/opportunities-timeline'),
        API.get('/dashboard/revenue-by-month'),
        API.get('/dashboard/clients-by-sector')
      ])

      setDashboardData(statsResponse.data)
      setTimelineData(timelineResponse.data)
      setRevenueData(revenueResponse.data)
      setClientsData(clientsResponse.data)
      
    } catch (err) {
      console.error('Erreur lors du chargement du dashboard:', err)
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Chargement du dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-primary">
          Réessayer
        </button>
      </div>
    )
  }

  // Préparer les données pour les graphiques
  const opportunitiesByStageData = {
    labels: dashboardData?.opportunities_by_stage?.labels || [],
    datasets: [{
      label: 'Nombre d\'opportunités',
      data: dashboardData?.opportunities_by_stage?.counts || [],
      backgroundColor: [
        'rgba(37, 99, 235, 0.7)',
        'rgba(16, 185, 129, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(239, 68, 68, 0.7)',
        'rgba(107, 114, 128, 0.7)',
        'rgba(139, 69, 19, 0.7)'
      ],
      borderColor: [
        'rgba(37, 99, 235, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(107, 114, 128, 1)',
        'rgba(139, 69, 19, 1)'
      ],
      borderWidth: 1
    }]
  }

  const revenueByMonthData = {
    labels: revenueData?.labels || [],
    datasets: [{
      label: 'Revenus 2024 (MAD)',
      data: revenueData?.revenue || [],
      borderColor: 'rgba(16, 185, 129, 1)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true
    }]
  }

  const clientsBySectorData = {
    labels: clientsData?.labels || [],
    datasets: [{
      label: 'Clients par secteur',
      data: clientsData?.counts || [],
      backgroundColor: [
        'rgba(37, 99, 235, 0.7)',
        'rgba(16, 185, 129, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(239, 68, 68, 0.7)',
        'rgba(107, 114, 128, 0.7)',
        'rgba(139, 69, 19, 0.7)',
        'rgba(168, 85, 247, 0.7)'
      ],
      borderWidth: 1
    }]
  }

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1 className="page-title">
          <i className="fas fa-chart-line me-2"></i>
          Dashboard ODDnet
        </h1>
        <button onClick={fetchDashboardData} className="btn btn-secondary">
          <i className="fas fa-sync-alt me-2"></i>
          Actualiser
        </button>
      </div>

      {/* Statistiques principales */}
<div className="stats-grid">
  <StatCard 
    title="Leads" 
    value={dashboardData?.stats?.leads || 0} 
    description="Leads en cours" 
    icon="fas fa-user-plus"
    iconColor="#3b82f6"
  />
  <StatCard 
    title="Opportunités" 
    value={dashboardData?.stats?.opportunities || 0} 
    description="Opportunités actives" 
    icon="fas fa-bullseye"
    iconColor="#f59e0b"
  />
  <StatCard 
    title="Devis" 
    value={dashboardData?.stats?.devis || 0} 
    description="Devis émis" 
    icon="fas fa-file-invoice"
    iconColor="#10b981"
  />
  <StatCard 
    title="Projets" 
    value={dashboardData?.stats?.projects || 0} 
    description="Projets en cours" 
    icon="fas fa-project-diagram"
    iconColor="#8b5cf6"
  />
  <StatCard 
    title="Bons de commande" 
    value={dashboardData?.stats?.purchase_orders || 0} 
    description="PO créés" 
    icon="fas fa-shopping-cart"
    iconColor="#ef4444"
  />
  <StatCard 
    title="Clients" 
    value={dashboardData?.stats?.clients || 0} 
    description="Clients actifs" 
    icon="fas fa-building"
    iconColor="#06b6d4"
  />
</div>

      {/* Alertes pour les opportunités critiques */}
      {timelineData && timelineData.critical_count > 0 && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <strong>Attention!</strong> {timelineData.critical_count} opportunité(s) dépassent 51 jours et nécessitent une action urgente.
        </div>
      )}

      {/* Graphiques */}
      <div className="grid">
        {/* Graphique de timeline des opportunités - NOUVEAU */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-clock me-2"></i>
                Suivi des Opportunités - Timeline
              </h2>
              <div className="card-stats">
                {timelineData && (
                  <>
                    <span className="stat-badge stat-normal">{timelineData.normal_count} Normal</span>
                    <span className="stat-badge stat-warning">{timelineData.warning_count} Attention</span>
                    <span className="stat-badge stat-critical">{timelineData.critical_count} Critique</span>
                  </>
                )}
              </div>
            </div>
            <div className="card-body">
              <OpportunityTimelineChart data={timelineData} />
            </div>
          </div>
        </div>

        {/* Opportunités par étape */}
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-tasks me-2"></i>
                Opportunités par étape
              </h2>
            </div>
            <div className="card-body">
              <BarChart 
                data={opportunitiesByStageData} 
                options={{ 
                  title: 'Répartition des opportunités par étape',
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>

        {/* Clients par secteur */}
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-chart-pie me-2"></i>
                Clients par secteur
              </h2>
            </div>
            <div className="card-body">
              <PieChart 
                data={clientsBySectorData} 
                options={{ title: 'Répartition des clients par secteur d\'activité' }} 
              />
            </div>
          </div>
        </div>

        {/* Revenus mensuels */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-chart-line me-2"></i>
                Revenus mensuels 2024
              </h2>
            </div>
            <div className="card-body">
              <LineChart 
                data={revenueByMonthData} 
                options={{ 
                  title: 'Évolution des revenus mensuels',
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return value.toLocaleString() + ' MAD'
                        }
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard