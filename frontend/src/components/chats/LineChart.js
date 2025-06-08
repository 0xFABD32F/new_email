"use client"

import { useEffect, useRef } from "react"
import Chart from "chart.js/auto"

function LineChart({ data, options = {} }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext("2d")

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: options.title || "",
          },
        },
        ...options,
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, options])

  return (
    <div className="chart-container">
      <canvas ref={chartRef}></canvas>
    </div>
  )
}

export default LineChart
