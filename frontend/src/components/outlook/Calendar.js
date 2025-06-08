"use client"

import { useState, useEffect } from "react"

function Calendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(() => {
    // Vérifier si l'utilisateur est authentifié
    const token = localStorage.getItem("outlook_token")
    if (!token) {
      setError("Vous devez vous connecter à Outlook pour voir votre calendrier")
      setLoading(false)
      return
    }

    // Simuler le chargement des événements depuis l'API Microsoft Graph
    fetchEvents(selectedDate)
      .then((data) => {
        setEvents(data)
        setLoading(false)
      })
      .catch((err) => {
        setError("Erreur lors du chargement du calendrier: " + err.message)
        setLoading(false)
      })
  }, [selectedDate])

  // Fonction de simulation pour la démonstration
  const fetchEvents = (date) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Générer des événements pour la semaine en cours
        const startOfWeek = new Date(date)
        startOfWeek.setDate(date.getDate() - date.getDay()) // Dimanche

        const events = []

        // Événements fixes
        events.push({
          id: "1",
          subject: "Réunion avec Banque Populaire",
          start: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 1, 10, 0), // Lundi 10:00
          end: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 1, 11, 30),
          location: "Siège BP, Casablanca",
          attendees: [
            { name: "Hassan Alaoui", email: "hassan@bp.ma" },
            { name: "Ali Yassine", email: "ali@oddnet.ma" },
          ],
        })

        events.push({
          id: "2",
          subject: "Présentation solution Cisco",
          start: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 2, 14, 0), // Mardi 14:00
          end: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 2, 16, 0),
          location: "Bureaux Maroc Telecom, Rabat",
          attendees: [
            { name: "Samira Bennani", email: "samira@iam.ma" },
            { name: "Adil El Bouzari", email: "adil@oddnet.ma" },
          ],
        })

        events.push({
          id: "3",
          subject: "Suivi projet OCP",
          start: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 3, 9, 0), // Mercredi 9:00
          end: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 3, 10, 0),
          location: "Appel Teams",
          attendees: [{ name: "Karim Tazi", email: "karim@ocpgroup.ma" }],
        })

        events.push({
          id: "4",
          subject: "Installation équipements Tanger Med",
          start: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 4, 8, 0), // Jeudi 8:00
          end: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 4, 17, 0),
          location: "Tanger Med",
          attendees: [
            { name: "Nadia Chraibi", email: "nadia@tangermed.ma" },
            { name: "Technicien 1", email: "tech1@oddnet.ma" },
            { name: "Technicien 2", email: "tech2@oddnet.ma" },
          ],
        })

        events.push({
          id: "5",
          subject: "Réunion d'équipe hebdomadaire",
          start: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 5, 16, 0), // Vendredi 16:00
          end: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 5, 17, 0),
          location: "Bureaux Oddnet",
          attendees: [{ name: "Équipe Oddnet", email: "team@oddnet.ma" }],
        })

        resolve(events)
      }, 1000)
    })
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
  }

  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() - 7)
    setSelectedDate(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + 7)
    setSelectedDate(newDate)
  }

  const handleEventClick = (event) => {
    setSelectedEvent(event)
  }

  const closeEventDetail = () => {
    setSelectedEvent(null)
  }

  // Générer les jours de la semaine
  const generateWeekDays = () => {
    const days = []
    const startOfWeek = new Date(selectedDate)
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay()) // Dimanche

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }

    return days
  }

  const weekDays = generateWeekDays()

  // Vérifier si un événement est le jour spécifié
  const isEventOnDay = (event, day) => {
    return (
      event.start.getDate() === day.getDate() &&
      event.start.getMonth() === day.getMonth() &&
      event.start.getFullYear() === day.getFullYear()
    )
  }

  if (loading) {
    return <div className="p-4">Chargement du calendrier...</div>
  }

  if (error) {
    return <div className="p-4 text-danger">{error}</div>
  }

  return (
    <div className="calendar-container">
      {selectedEvent ? (
        <div className="event-detail card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">{selectedEvent.subject}</h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={closeEventDetail}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <i className="fas fa-clock me-2"></i>
              <strong>Date et heure:</strong> {formatDate(selectedEvent.start)} de {formatTime(selectedEvent.start)} à{" "}
              {formatTime(selectedEvent.end)}
            </div>
            <div className="mb-3">
              <i className="fas fa-map-marker-alt me-2"></i>
              <strong>Lieu:</strong> {selectedEvent.location}
            </div>
            <div className="mb-3">
              <i className="fas fa-users me-2"></i>
              <strong>Participants:</strong>
              <ul className="list-unstyled ms-4 mt-2">
                {selectedEvent.attendees.map((attendee, index) => (
                  <li key={index}>
                    {attendee.name} ({attendee.email})
                  </li>
                ))}
              </ul>
            </div>
            <div className="d-flex justify-content-end">
              <button className="btn btn-outline-primary me-2">
                <i className="fas fa-edit me-1"></i> Modifier
              </button>
              <button className="btn btn-outline-danger">
                <i className="fas fa-trash-alt me-1"></i> Supprimer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="calendar-view">
          <div className="calendar-header d-flex justify-content-between align-items-center mb-3">
            <button className="btn btn-outline-secondary" onClick={handlePrevWeek}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <h5 className="mb-0">
              Semaine du {formatDate(weekDays[0])} au {formatDate(weekDays[6])}
            </h5>
            <button className="btn btn-outline-secondary" onClick={handleNextWeek}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          <div className="calendar-grid">
            {weekDays.map((day, index) => (
              <div key={index} className={`calendar-day ${day.getDate() === new Date().getDate() ? "today" : ""}`}>
                <div className="day-header">
                  <div className="day-name">{day.toLocaleDateString("fr-FR", { weekday: "short" })}</div>
                  <div className="day-number">{day.getDate()}</div>
                </div>
                <div className="day-events">
                  {events
                    .filter((event) => isEventOnDay(event, day))
                    .map((event) => (
                      <div key={event.id} className="event-item" onClick={() => handleEventClick(event)}>
                        <div className="event-time">
                          {formatTime(event.start)} - {formatTime(event.end)}
                        </div>
                        <div className="event-title">{event.subject}</div>
                        <div className="event-location">{event.location}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-3">
            <button className="btn btn-primary">
              <i className="fas fa-plus me-1"></i> Nouvel événement
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar