import API from "./api"

class NotificationService {
  constructor() {
    this.listeners = new Set()
    this.isPolling = false
    this.pollInterval = null
    this.lastNotificationCount = 0
    this.currentNotifications = []
  }

  // Démarrer le polling automatique des notifications
  startRealTimeNotifications() {
    if (this.isPolling) return

    this.isPolling = true
    console.log("🔔 Démarrage des notifications en temps réel")

    // Charger immédiatement
    this.checkForUpdates()

    // Puis vérifier toutes les 10 secondes
    this.pollInterval = setInterval(() => {
      this.checkForUpdates()
    }, 10000)
  }

  // Arrêter le polling
  stopRealTimeNotifications() {
    if (!this.isPolling) return

    this.isPolling = false
    console.log("🔕 Arrêt des notifications en temps réel")

    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  // Vérifier les mises à jour
  async checkForUpdates() {
    try {
      const criticalOpportunities = await this.getCriticalOpportunities()
      const newCount = criticalOpportunities.length

      // Vérifier s'il y a des changements
      const hasChanges = this.hasNotificationChanges(criticalOpportunities)

      // Vérifier spécifiquement les opportunités qui viennent de dépasser 51 jours
      const newlyExceeding51Days = this.detectNewlyExceeding51Days(criticalOpportunities)

      if (hasChanges || newlyExceeding51Days.length > 0) {
        console.log(`🔔 Nouvelles notifications détectées: ${newCount} opportunités critiques`)

        // Si des opportunités viennent de dépasser 51 jours, afficher une alerte spéciale
        if (newlyExceeding51Days.length > 0) {
          console.log(`⚠️ ALERTE: ${newlyExceeding51Days.length} opportunités viennent de dépasser 51 jours!`)

          this.notifyListeners({
            type: "CRITICAL_ALERT",
            notifications: newlyExceeding51Days,
            count: newlyExceeding51Days.length,
            timestamp: new Date(),
          })

          // Notification système urgente pour les opportunités qui dépassent 51 jours
          this.showCriticalNotification(newlyExceeding51Days)
        }

        // Mettre à jour les données locales
        this.currentNotifications = criticalOpportunities
        this.lastNotificationCount = newCount

        // Notifier tous les listeners
        this.notifyListeners({
          type: "UPDATE",
          notifications: criticalOpportunities,
          count: newCount,
          timestamp: new Date(),
        })
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des notifications:", error)
    }
  }

  // Vérifier s'il y a des changements dans les notifications
  hasNotificationChanges(newNotifications) {
    if (newNotifications.length !== this.currentNotifications.length) {
      return true
    }

    // Vérifier les IDs et les dates
    const newIds = new Set(newNotifications.map((n) => `${n.id}-${n.current_step_date}`))
    const currentIds = new Set(this.currentNotifications.map((n) => `${n.id}-${n.current_step_date}`))

    return newIds.size !== currentIds.size || [...newIds].some((id) => !currentIds.has(id))
  }

  // Notification système critique (>51 jours)
  showCriticalNotification(opportunities) {
    if (!("Notification" in window)) return

    // Demander la permission si nécessaire
    if (Notification.permission === "default") {
      Notification.requestPermission()
      return
    }

    if (Notification.permission === "granted") {
      const count = opportunities.length
      const title =
        count === 1
          ? "⚠️ ALERTE CRITIQUE - Opportunité > 51 jours"
          : `⚠️ ALERTE CRITIQUE - ${count} opportunités > 51 jours`

      const body =
        count === 1
          ? `${opportunities[0].company_name} a dépassé 51 jours sans mise à jour!`
          : `${count} opportunités ont dépassé 51 jours sans mise à jour!`

      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "critical-opportunities",
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200],
      })
    }
  }

  // Ajouter un listener pour les mises à jour
  addListener(callback) {
    this.listeners.add(callback)

    // Retourner une fonction pour supprimer le listener
    return () => {
      this.listeners.delete(callback)
    }
  }

  // Notifier tous les listeners
  notifyListeners(data) {
    this.listeners.forEach((callback) => {
      try {
        callback(data)
      } catch (error) {
        console.error("Erreur dans un listener de notification:", error)
      }
    })
  }

  // Calculer les jours depuis la dernière mise à jour
  calculateDaysSinceUpdate(dateString) {
    const now = new Date()
    const updateDate = new Date(dateString)
    const diffTime = Math.abs(now - updateDate)
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Récupérer les opportunités critiques (>51 jours)
  async getCriticalOpportunities() {
    try {
      const response = await API.get("/opportunities/")
      const opportunities = response.data

      const criticalOpportunities = opportunities.filter((opportunity) => {
        if (!opportunity.current_step_date) return false

        const daysSinceUpdate = this.calculateDaysSinceUpdate(opportunity.current_step_date)

        // Ajouter le nombre de jours à l'objet pour faciliter le tri et l'affichage
        opportunity.daysSinceUpdate = daysSinceUpdate

        // Uniquement les opportunités de plus de 51 jours
        return daysSinceUpdate >= 51
      })

      return criticalOpportunities.sort((a, b) => {
        return b.daysSinceUpdate - a.daysSinceUpdate
      })
    } catch (error) {
      console.error("Erreur lors de la récupération des opportunités critiques:", error)
      return []
    }
  }

  // Forcer une mise à jour manuelle
  async forceUpdate() {
    console.log("🔄 Mise à jour forcée des notifications")
    await this.checkForUpdates()
  }

  // Obtenir le statut actuel
  getStatus() {
    return {
      isPolling: this.isPolling,
      notificationCount: this.lastNotificationCount,
      lastUpdate: new Date(),
      notifications: this.currentNotifications,
    }
  }

  // Demander la permission pour les notifications
  async requestNotificationPermission() {
    if (!("Notification" in window)) {
      console.log("Ce navigateur ne supporte pas les notifications")
      return false
    }

    if (Notification.permission === "granted") {
      return true
    }

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission()
      return permission === "granted"
    }

    return false
  }

  // Détecter les opportunités qui viennent de dépasser 51 jours
  detectNewlyExceeding51Days(currentOpportunities) {
    // Si c'est la première vérification, on n'a pas de données précédentes pour comparer
    if (this.currentNotifications.length === 0) {
      return []
    }

    // Trouver les opportunités qui viennent de dépasser 51 jours
    return currentOpportunities.filter((current) => {
      // Calculer les jours depuis la dernière mise à jour
      const daysSinceUpdate = this.calculateDaysSinceUpdate(current.current_step_date)

      // Vérifier si l'opportunité dépasse maintenant 51 jours
      if (daysSinceUpdate >= 51) {
        const previous = this.currentNotifications.find((prev) => prev.id === current.id)

        // Si elle n'existait pas avant ou si elle n'avait pas dépassé 51 jours avant
        if (!previous || this.calculateDaysSinceUpdate(previous.current_step_date) < 51) {
          return true
        }
      }
      return false
    })
  }
}

// Instance singleton
export const notificationService = new NotificationService()

// Export par défaut pour compatibilité
export default notificationService
