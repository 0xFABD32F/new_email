import React, { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

function OpportunityTimelineChart({ data, options = {} }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    if (!data || !data.opportunities || data.opportunities.length === 0) {
      return
    }

    const ctx = chartRef.current.getContext('2d')

    // Préparer les données pour le graphique horizontal
    const labels = data.opportunities.map(opp => 
      `${opp.company_name} - ${opp.project.substring(0, 30)}${opp.project.length > 30 ? '...' : ''}`
    )
    
    const chartData = data.opportunities.map(opp => opp.days_since_creation)
    const backgroundColors = data.opportunities.map(opp => opp.color)
    const borderColors = data.opportunities.map(opp => opp.color)

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Jours depuis création',
          data: chartData,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
          barThickness: 20,
        }]
      },
      options: {
        indexAxis: 'y', // Graphique horizontal
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Suivi des Opportunités - Timeline',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex
                const opp = data.opportunities[index]
                return `${opp.company_name}`
              },
              label: function(context) {
                const index = context.dataIndex
                const opp = data.opportunities[index]
                return [
                  `Projet: ${opp.project}`,
                  `Étape: ${opp.current_step}`,
                  `Jours: ${opp.days_since_creation}`,
                  `Montant: ${opp.montant_devis.toLocaleString()} MAD`,
                  `Devis: ${opp.devis_number}`
                ]
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Nombre de jours depuis création'
            },
            grid: {
              color: function(context) {
                // Ligne rouge à 15 jours et 51 jours
                if (context.tick.value === 15 || context.tick.value === 51) {
                  return '#ef4444'
                }
                return '#e5e7eb'
              },
              lineWidth: function(context) {
                if (context.tick.value === 15 || context.tick.value === 51) {
                  return 2
                }
                return 1
              }
            }
          },
          y: {
            ticks: {
              font: {
                size: 10
              },
              maxTicksLimit: 20
            }
          }
        },
        ...options
      }
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, options])

  if (!data || !data.opportunities || data.opportunities.length === 0) {
    return (
      <div className="chart-container">
        <div className="no-data">
          <p>Aucune opportunité à afficher</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-container" style={{ height: '400px', maxHeight: '600px' }}>
      <canvas ref={chartRef}></canvas>
      
      {/* Légende personnalisée */}
      <div className="timeline-legend" style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '15px', height: '15px', backgroundColor: '#10b981' }}></div>
          <span style={{ fontSize: '12px' }}>≤ 15 jours (Normal)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '15px', height: '15px', backgroundColor: '#f59e0b' }}></div>
          <span style={{ fontSize: '12px' }}>16-51 jours (Attention)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '15px', height: '15px', backgroundColor: '#ef4444' }}></div>
          <span style={{ fontSize: '12px' }}> 51 jours (Critique)</span>
        </div>
      </div>
    </div>
  )
}

export default OpportunityTimelineChart