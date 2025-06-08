"use client"

import { useState, useEffect } from "react"
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { searchService } from "../../services/searchService"
import { notificationService } from "../../services/notificationService"
import { userService } from "../../services/userService"
import { getCurrentUserName, isAuthenticated } from "../../services/auth"
import emailNotificationService from '../../services/emailNotificationService'
import "./DashboardLayout.css"
import "./DashboardLayoutExtensions.css"

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationCount, setNotificationCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [userLoadError, setUserLoadError] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState("Initialisation...")
  const [lastNotificationUpdate, setLastNotificationUpdate] = useState(null)
  const [emailNotifications, setEmailNotifications] = useState([])
  const [showEmailNotifications, setShowEmailNotifications] = useState(false)
  const [emailNotificationStatus, setEmailNotificationStatus] = useState('En temps réel')
  const location = useLocation()
  const navigate = useNavigate()

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 991.98
      setIsMobile(mobile)
      if (mobile) {
        setSidebarOpen(false)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Vérifier l'authentification et charger les informations utilisateur
  useEffect(() => {
    if (!isAuthenticated()) {
      console.log("Utilisateur non authentifié, redirection vers login")
      navigate("/login")
      return
    }

    loadCurrentUser()
  }, [navigate])

  // Démarrer les notifications en temps réel
  useEffect(() => {
    if (isAuthenticated()) {
      console.log("🚀 Initialisation des notifications en temps réel")

      // Demander la permission pour les notifications système
      notificationService.requestNotificationPermission()

      // Ajouter un listener pour les mises à jour
      const unsubscribe = notificationService.addListener((data) => {
        console.log("📢 Notification reçue:", data)

        setNotifications(data.notifications)
        setNotificationCount(data.count)
        setLastNotificationUpdate(data.timestamp)

        if (data.type === "CRITICAL_ALERT") {
          // Notification spéciale pour le dépassement du seuil de 51 jours
          setNotificationStatus(`⚠️ ${data.count} opportunité(s) &gt; 51 jours!`)

          // Ouvrir automatiquement le panneau de notifications
          setShowNotifications(true)

          // Jouer un son d'alerte si disponible
          try {
            const audio = new Audio("/alert.mp3")
            audio.play()
          } catch (e) {
            console.log("Son d'alerte non disponible")
          }
        } else {
          setNotificationStatus(`✅ Mis à jour - ${data.count} opportunités &gt; 51 jours`)
        }

        // Auto-fermer le status après 5 secondes
        setTimeout(() => {
          setNotificationStatus("En temps réel")
        }, 5000)
      })

      // Démarrer le polling
      notificationService.startRealTimeNotifications()

      // Cleanup au démontage
      return () => {
        console.log("🛑 Arrêt des notifications en temps réel")
        unsubscribe()
        notificationService.stopRealTimeNotifications()
      }
    }
  }, [])

  // Start email notifications
  useEffect(() => {
    if (isAuthenticated()) {
      console.log("📧 Initializing email notifications");

      // Add listener for email updates
      const unsubscribe = emailNotificationService.addListener((data) => {
        console.log("📧 Email notification received:", data);

        setEmailNotifications(data.emails);
        
        if (data.type === "NEW_EMAILS") {
          setEmailNotificationStatus(`${data.count} nouveau(x) email(s)`);
          
          // Auto-close status after 5 seconds
          setTimeout(() => {
            setEmailNotificationStatus('En temps réel');
          }, 5000);
        }
      });

      // Start polling
      emailNotificationService.startEmailNotifications();

      // Cleanup on unmount
      return () => {
        console.log("🛑 Stopping email notifications");
        unsubscribe();
        emailNotificationService.stopEmailNotifications();
      };
    }
  }, []);

  const loadCurrentUser = async () => {
    try {
      setUserLoadError(false)

      // D'abord, essayer de récupérer les informations depuis localStorage
      const storedInfo = userService.getStoredUserInfo()
      if (storedInfo.userId) {
        const tempUser = {
          id: storedInfo.userId,
          nom: getCurrentUserName() || "Utilisateur",
          email: storedInfo.email,
          role: storedInfo.role,
          droit_acces: storedInfo.droitAcces,
        }
        setCurrentUser(tempUser)
      }

      // Ensuite, essayer de récupérer les informations complètes depuis l'API
      const response = await userService.getCurrentUser()
      setCurrentUser(response.data)

      // Mettre à jour localStorage avec les dernières informations
      localStorage.setItem("userName", response.data.nom)
    } catch (error) {
      console.error("Erreur lors du chargement de l'utilisateur:", error)
      setUserLoadError(true)

      // Si l'erreur est due à l'authentification, rediriger vers login
      if (error.response?.status === 404 || error.response?.status === 401) {
        console.log("Erreur d'authentification, redirection vers login")
        navigate("/login")
      } else {
        // Sinon, utiliser les informations stockées localement
        const storedInfo = userService.getStoredUserInfo()
        if (storedInfo.userId) {
          const fallbackUser = {
            id: storedInfo.userId,
            nom: getCurrentUserName() || "Utilisateur",
            email: storedInfo.email,
            role: storedInfo.role,
            droit_acces: storedInfo.droitAcces,
          }
          setCurrentUser(fallbackUser)
        }
      }
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  const openSidebar = () => {
    setSidebarOpen(true)
  }

  const isActive = (path) => {
    return location.pathname.startsWith(path) ? "active" : ""
  }

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      // Arrêter les notifications avant de se déconnecter
      notificationService.stopRealTimeNotifications()

      await new Promise((resolve) => setTimeout(resolve, 500))
      localStorage.removeItem("authToken")
      localStorage.removeItem("userId")
      localStorage.removeItem("userEmail")
      localStorage.removeItem("userRole")
      localStorage.removeItem("userDroitAcces")
      localStorage.removeItem("userName")
      sessionStorage.clear()
      navigate("/")
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Gestion de la recherche
  const handleSearchChange = async (e) => {
    const query = e.target.value
    setSearchQuery(query)

    if (query.length >= 2) {
      try {
        const results = await searchService.search(query)
        setSearchResults(results)
        setShowSearchResults(true)
      } catch (error) {
        console.error("Erreur lors de la recherche:", error)
        setSearchResults([])
      }
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }

  const handleSearchSelect = (result) => {
    navigate(result.path)
    setSearchQuery("")
    setShowSearchResults(false)
    setSearchResults([])
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      handleSearchSelect(searchResults[0])
    } else if (e.key === "Escape") {
      setShowSearchResults(false)
      setSearchQuery("")
    }
  }

  // Forcer une mise à jour manuelle des notifications
  const handleManualRefresh = async () => {
    setNotificationStatus("🔄 Actualisation...")
    try {
      await notificationService.forceUpdate()
      setNotificationStatus(`✅ Actualisé - ${notificationCount} opportunités &gt; 51 jours`)
      setTimeout(() => setNotificationStatus("En temps réel"), 3000)
    } catch (error) {
      setNotificationStatus("❌ Erreur")
      setTimeout(() => setNotificationStatus("En temps réel"), 2000)
    }
  }

  // Fermer les dropdowns quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".header-search")) {
        setShowSearchResults(false)
      }
      if (!event.target.closest(".notifications-dropdown")) {
        setShowNotifications(false)
      }
      if (!event.target.closest(".user-menu-dropdown")) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Fermer la sidebar lors du changement de route sur mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [location.pathname, isMobile])

  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        document.querySelector(".header-search input")?.focus()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault()
        toggleSidebar()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [sidebarOpen])

  // Formater le temps de notification (jours depuis la dernière mise à jour)
  const formatNotificationTime = (date, opportunity) => {
    // Si l'opportunité a déjà le nombre de jours calculé, l'utiliser
    const diffInDays =
      opportunity?.daysSinceUpdate ||
      (() => {
        const now = new Date()
        const notifDate = new Date(date)
        return Math.floor((now - notifDate) / (1000 * 60 * 60 * 24))
      })()

    return `${diffInDays} jours sans mise à jour`
  }

  const getUserInitials = (name) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getRoleDisplayName = (role) => {
    const roleMap = {
      admin: "Administrateur",
      expert: "Expert",
      ceo: "CEO",
      user: "Utilisateur",
    }
    return roleMap[role?.toLowerCase()] || role || "Utilisateur"
  }

  return (
    <div className="dashboard-layout">
      <div className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-logo">
            <i className="fas fa-network-wired logo-icon"></i>
            <span>Oddnet CRM</span>
          </Link>
          <button
            className="sidebar-close-btn"
            onClick={closeSidebar}
            aria-label="Fermer le menu"
            title="Fermer le menu (Échap)"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="sidebar-content">
          {/* Section utilisateur avec lien vers le profil */}
          <Link to="/dashboard/profile" className="sidebar-user">
            <div className="user-avatar">
              {currentUser ? getUserInitials(currentUser.nom) : <i className="fas fa-user"></i>}
            </div>
            <div className="user-info">
              <div className="user-name">
                {currentUser?.nom || getCurrentUserName() || "Chargement..."}
                {userLoadError && (
                  <span className="error-indicator" title="Erreur de chargement">
                    ⚠️
                  </span>
                )}
              </div>
              <div className="user-role">{getRoleDisplayName(currentUser?.role)}</div>
            </div>
          </Link>

          <nav className="sidebar-nav" role="navigation" aria-label="Navigation principale">
            {/* Section PRINCIPAL */}
            <div className="nav-section">
              <div className="nav-section-title">PRINCIPAL</div>
              <Link
                to="/dashboard"
                className={`nav-item ${location.pathname === "/dashboard" ? "active" : ""}`}
                title="Tableau de bord"
              >
                <i className="fas fa-tachometer-alt"></i>
                <span>Tableau de bord</span>
              </Link>
              <Link
                to="/dashboard/users"
                className={`nav-item ${isActive("/dashboard/users")}`}
                title="Gestion des utilisateurs"
              >
                <i className="fas fa-users"></i>
                <span>Utilisateurs</span>
              </Link>
              <Link
                to="/dashboard/leads"
                className={`nav-item ${isActive("/dashboard/leads")}`}
                title="Gestion des prospects"
              >
                <i className="fas fa-funnel-dollar"></i>
                <span>Canal</span>
              </Link>
            </div>

            {/* Section GESTION */}
            <div className="nav-section">
              <div className="nav-section-title">GESTION</div>
              <Link
                to="/dashboard/tasks"
                className={`nav-item ${isActive("/dashboard/tasks")}`}
                title="Gestion des tâches"
              >
                <i className="fas fa-tasks"></i>
                <span>Tâches</span>
              </Link>
              <Link
                to="/dashboard/hardware"
                className={`nav-item ${isActive("/dashboard/hardware")}`}
                title="Matériel informatique et télécommunications"
              >
                <i className="fas fa-server"></i>
                <span>Matériel informatique et télécommunications</span>
              </Link>
              <Link
                to="/dashboard/clients"
                className={`nav-item ${isActive("/dashboard/clients")}`}
                title="Gestion de la clientèle"
              >
                <i className="fas fa-building"></i>
                <span>Clientèle</span>
              </Link>
              <Link
                to="/dashboard/suppliers"
                className={`nav-item ${isActive("/dashboard/suppliers")}`}
                title="Gestion des fournisseurs"
              >
                <i className="fas fa-truck"></i>
                <span>Fournisseurs</span>
              </Link>
              <Link
                to="/dashboard/products"
                className={`nav-item ${isActive("/dashboard/products")}`}
                title="Gestion des fournitures"
              >
                <i className="fas fa-boxes"></i>
                <span>Fournitures</span>
              </Link>
              <Link
                to="/dashboard/shipping"
                className={`nav-item ${isActive("/dashboard/shipping")}`}
                title="Frais de transport"
              >
                <i className="fas fa-truck-loading"></i>
                <span>Frais de transport</span>
              </Link>
            </div>

            {/* Section COMMERCIAL */}
            <div className="nav-section">
              <div className="nav-section-title">COMMERCIAL</div>
              <Link
                to="/dashboard/opportunities"
                className={`nav-item ${isActive("/dashboard/opportunities")}`}
                title="Gestion des opportunités"
              >
                <i className="fas fa-lightbulb"></i>
                <span>Opportunités</span>
              </Link>
              <Link
                to="/dashboard/projects"
                className={`nav-item ${isActive("/dashboard/projects")}`}
                title="Gestion des projets"
              >
                <i className="fas fa-project-diagram"></i>
                <span>Projets</span>
              </Link>
              <Link
                to="/dashboard/devis"
                className={`nav-item ${isActive("/dashboard/devis")}`}
                title="Gestion des devis"
              >
                <i className="fas fa-file-invoice-dollar"></i>
                <span>Devis</span>
              </Link>
              <Link
                to="/dashboard/purchase-orders"
                className={`nav-item ${isActive("/dashboard/purchase-orders")}`}
                title="Bons de commande"
              >
                <i className="fas fa-file-invoice"></i>
                <span>Bons de commande</span>
              </Link>
              <Link
                to="/dashboard/communication"
                className={`nav-item ${isActive("/dashboard/communication")}`}
                title="Centre de communication"
              >
                <i className="fas fa-envelope"></i>
                <span>Communication</span>
              </Link>
            </div>
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout} disabled={isLoading} title="Se déconnecter du système">
            <i className={`fas ${isLoading ? "fa-spinner fa-spin" : "fa-sign-out-alt"}`}></i>
            <span>{isLoading ? "Déconnexion..." : "Déconnexion"}</span>
          </button>
        </div>
      </div>

      <div className={`main-content ${!sidebarOpen ? "expanded" : ""}`}>
        <header className="content-header">
          {!sidebarOpen && (
            <button
              className="sidebar-toggle-btn"
              onClick={openSidebar}
              aria-label="Ouvrir le menu"
              title="Ouvrir le menu de navigation (Ctrl+B)"
            >
              <i className="fas fa-bars"></i>
            </button>
          )}

          {/* Barre de recherche améliorée */}
          <div className="header-search">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Rechercher... (Ctrl+K)"
              aria-label="Recherche globale"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
            />

            {/* Résultats de recherche */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result, index) => (
                  <div key={index} className="search-result-item" onClick={() => handleSearchSelect(result)}>
                    <i className={result.icon}></i>
                    <div className="search-result-content">
                      <div className="search-result-title">{result.title}</div>
                      <div className="search-result-description">{result.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="header-actions">
            {/* Notifications intelligentes EN TEMPS RÉEL */}
            <div className="notifications-dropdown">
              <button
                className="header-action-btn"
                aria-label="Notifications"
                title={`Notifications en temps réel (${notificationCount} opportunités &gt; 51 jours)`}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <i className="fas fa-bell"></i>
                {notificationCount > 0 && <span className={`badge badge-critical`}>{notificationCount}</span>}
              </button>

              {/* Dropdown des notifications */}
              {showNotifications && (
                <div className="notifications-panel">
                  <div className="notifications-header">
                    <h3>Opportunités critiques &gt; 51 jours</h3>
                    <div className="notification-controls">
                      <span
                        className="notification-status"
                        title={`Dernière mise à jour: ${lastNotificationUpdate?.toLocaleTimeString()}`}
                      >
                        {notificationStatus}
                      </span>
                      <button
                        className="refresh-notifications"
                        onClick={handleManualRefresh}
                        title="Actualiser manuellement"
                      >
                        <i className="fas fa-sync-alt"></i>
                      </button>
                    </div>
                  </div>

                  <div className="notifications-content">
                    {notifications.length === 0 ? (
                      <div className="no-notifications">
                        <i className="fas fa-check-circle"></i>
                        <p>Aucune opportunité critique</p>
                        <small>Surveillance en temps réel active</small>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="notification-item critical"
                          onClick={() => {
                            navigate("/dashboard/opportunities")
                            setShowNotifications(false)
                          }}
                        >
                          <div className="notification-icon">
                            <i className="fas fa-exclamation-triangle"></i>
                          </div>
                          <div className="notification-content">
                            <div className="notification-title">{notification.company_name}</div>
                            <div className="notification-description">
                              {notification.project || "Projet non spécifié"}
                            </div>
                            <div className="notification-time">
                              {formatNotificationTime(notification.current_step_date, notification)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="notifications-footer">
                      <button
                        className="view-all-btn"
                        onClick={() => {
                          navigate("/dashboard/opportunities")
                          setShowNotifications(false)
                        }}
                      >
                        Voir toutes les opportunités
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Email notifications */}
            <div className="notifications-dropdown">
              <button 
                className="header-action-btn" 
                aria-label="Messages" 
                title="Messages"
                onClick={() => setShowEmailNotifications(!showEmailNotifications)}
              >
                <i className="fas fa-envelope"></i>
                {emailNotifications.length > 0 && (
                  <span className="badge">{emailNotifications.length}</span>
                )}
              </button>

              {/* Email notifications panel */}
              {showEmailNotifications && (
                <div className="notifications-panel">
                  <div className="notifications-header">
                    <h3>Nouveaux emails</h3>
                    <div className="notification-controls">
                      <span className="notification-status">
                        {emailNotificationStatus}
                      </span>
                    </div>
                  </div>

                  <div className="notifications-content">
                    {emailNotifications.length === 0 ? (
                      <div className="no-notifications">
                        <i className="fas fa-envelope"></i>
                        <p>Aucun nouveau message</p>
                        <small>Surveillance en temps réel active</small>
                      </div>
                    ) : (
                      emailNotifications.map((email) => (
                        <div
                          key={email.id}
                          className="notification-item"
                          onClick={() => {
                            navigate("/dashboard/communication");
                            setShowEmailNotifications(false);
                          }}
                        >
                          <div className="notification-icon">
                            <i className="fas fa-envelope"></i>
                          </div>
                          <div className="notification-content">
                            <div className="notification-title">
                              {email.from?.emailAddress?.name || 'Unknown Sender'}
                            </div>
                            <div className="notification-description">
                              {email.subject || 'No Subject'}
                            </div>
                            <div className="notification-time">
                              {new Date(email.receivedDateTime).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {emailNotifications.length > 0 && (
                    <div className="notifications-footer">
                      <button
                        className="view-all-btn"
                        onClick={() => {
                          navigate("/dashboard/communication");
                          setShowEmailNotifications(false);
                        }}
                      >
                        Voir tous les emails
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Menu utilisateur avec dropdown */}
            <div className="user-menu-dropdown">
              <div className="header-user" title="Menu utilisateur" onClick={() => setShowUserMenu(!showUserMenu)}>
                <div className="user-avatar-header">
                  {currentUser ? getUserInitials(currentUser.nom) : <i className="fas fa-user"></i>}
                </div>
                <i className="fas fa-chevron-down user-menu-arrow"></i>
              </div>

              {/* Dropdown menu utilisateur */}
              {showUserMenu && (
                <div className="user-menu-panel">
                  <div className="user-menu-header">
                    <div className="user-menu-avatar">
                      {currentUser ? getUserInitials(currentUser.nom) : <i className="fas fa-user"></i>}
                    </div>
                    <div className="user-menu-info">
                      <div className="user-menu-name">{currentUser?.nom || getCurrentUserName() || "Utilisateur"}</div>
                      <div className="user-menu-role">{getRoleDisplayName(currentUser?.role)}</div>
                      <div className="user-menu-email">{currentUser?.email}</div>
                    </div>
                  </div>

                  <div className="user-menu-content">
                    <Link to="/dashboard/profile" className="user-menu-item" onClick={() => setShowUserMenu(false)}>
                      <i className="fas fa-user-circle"></i>
                      <span>Mon Profil</span>
                    </Link>
                    <Link
                      to="/dashboard/profile/settings"
                      className="user-menu-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <i className="fas fa-cog"></i>
                      <span>Paramètres</span>
                    </Link>
                    <div className="user-menu-divider"></div>
                    <button className="user-menu-item logout-item" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-wrapper">
          <Outlet />
        </div>
      </div>

      <div
        className={`sidebar-overlay ${sidebarOpen && isMobile ? "active" : ""}`}
        onClick={closeSidebar}
        aria-hidden="true"
      ></div>
    </div>
  )
}

export default DashboardLayout
