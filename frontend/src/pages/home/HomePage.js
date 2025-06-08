"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import "./HomePage.css"
import Navbar from "../../components/home/Navbar"
import FeatureCard from "../../components/home/FeatureCard"

function HomePage() {
  const [activeWord, setActiveWord] = useState(0)
  const words = ["Centralisez", "Organisez", "Optimisez", "Gérez", "Développez"]
  const [isOpen, setIsOpen] = useState(null)

  // Effet pour changer le mot toutes les 2 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWord((prev) => (prev + 1) % words.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const toggleFaq = (index) => {
    if (isOpen === index) {
      setIsOpen(null)
    } else {
      setIsOpen(index)
    }
  }

  return (
    <div className="home-page">
      <Navbar />

      <div className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1>
              <span className="highlight">{words[activeWord]}</span> <br />
              votre gestion commerciale efficacement
            </h1>
            <p className="hero-subtitle">
              Gérez vos prospects, suivez vos opportunités et analysez vos performances grâce à notre solution intégrée
              avec Outlook
            </p>
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-primary btn-lg">
                Commencer gratuitement
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div id="features" className="features-section">
        <div className="container">
          <div className="section-title">
            <h2>Nos fonctionnalités</h2>
            <p>Découvrez les outils qui vous aideront à optimiser votre gestion commerciale</p>
          </div>
          <div className="features-grid">
            <FeatureCard
              icon="fas fa-envelope"
              title="Intégration Outlook"
              description="Synchronisez vos emails et associez-les automatiquement à vos dossiers clients et prospects."
            />
            <FeatureCard
              icon="fas fa-funnel-dollar"
              title="Suivi des opportunités"
              description="Centralisez vos prospects et suivez chaque étape de conversion avec précision."
            />
            <FeatureCard
              icon="fas fa-chart-line"
              title="Analyse financière"
              description="Calculez automatiquement vos coûts, profits et marges pour chaque projet."
            />
          </div>
        </div>
      </div>

      <div id="why-us" className="why-us-section">
        <div className="container">
          <h2>
            Pourquoi les entrepreneurs choisissent <span className="company-name">OddnetCRM</span>
          </h2>
          <div className="benefits-grid">
            <div className="benefit-item">
              <div className="benefit-icon">
                <i className="fas fa-tachometer-alt"></i>
              </div>
              <h3>Simplicité</h3>
              <p>Centralisez tous vos documents et interactions commerciales en quelques clics.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <i className="fas fa-bolt"></i>
              </div>
              <h3>Rapidité</h3>
              <p>Un simple questionnaire à remplir en ligne. Traitement des données en temps réel.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>Fiabilité</h3>
              <p>Des traitements sécurisés par nos experts pour garantir la conformité de vos données.</p>
            </div>
          </div>
        </div>
      </div>

      <div id="pricing" className="pricing-section">
        <div className="container">
          <div className="section-title">
            <h2>Nos tarifs</h2>
            <p>Des formules adaptées à tous les besoins</p>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Essentiel</h3>
              <div className="pricing-price">
                29€<span>/mois</span>
              </div>
              <ul className="pricing-features">
                <li>Gestion des prospects</li>
                <li>Suivi des opportunités</li>
                <li>Intégration email basique</li>
                <li>Tableau de bord simple</li>
                <li>Support par email</li>
              </ul>
              <Link to="/register" className="btn btn-outline">
                Choisir ce forfait
              </Link>
            </div>

            <div className="pricing-card popular">
              <div className="popular-badge">Populaire</div>
              <h3>Professionnel</h3>
              <div className="pricing-price">
                59€<span>/mois</span>
              </div>
              <ul className="pricing-features">
                <li>Tout ce qui est inclus dans Essentiel</li>
                <li>Intégration Outlook complète</li>
                <li>Analyse financière avancée</li>
                <li>Gestion des workflows</li>
                <li>Support prioritaire</li>
              </ul>
              <Link to="/register" className="btn btn-primary">
                Choisir ce forfait
              </Link>
            </div>

            <div className="pricing-card">
              <h3>Entreprise</h3>
              <div className="pricing-price">
                99€<span>/mois</span>
              </div>
              <ul className="pricing-features">
                <li>Tout ce qui est inclus dans Professionnel</li>
                <li>Gestion multi-utilisateurs</li>
                <li>Rapports personnalisés</li>
                <li>API pour intégrations</li>
                <li>Support dédié 24/7</li>
              </ul>
              <Link to="/register" className="btn btn-outline">
                Choisir ce forfait
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="faq-section">
        <div className="container">
          <div className="faq-title">
            <h2>
              Questions <span>fréquentes</span>
            </h2>
          </div>
          <div className="faq-grid">
            <div className={`faq-item ${isOpen === 0 ? "open" : ""}`}>
              <div className="faq-question" onClick={() => toggleFaq(0)}>
                <span>Comment fonctionne le processus d'intégration avec Outlook ?</span>
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="faq-answer">
                <p>
                  Notre solution utilise l'API Microsoft Graph pour se connecter à votre compte Outlook. Après avoir
                  autorisé l'accès, tous vos emails sont automatiquement synchronisés et peuvent être associés à vos
                  clients et opportunités. Vous pouvez également envoyer des emails directement depuis notre plateforme.
                </p>
              </div>
            </div>

            <div className={`faq-item ${isOpen === 1 ? "open" : ""}`}>
              <div className="faq-question" onClick={() => toggleFaq(1)}>
                <span>Qu'est-ce qui différencie OddnetCRM de ses concurrents ?</span>
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="faq-answer">
                <p>
                  Notre intégration poussée avec Outlook est unique sur le marché. De plus, notre système de calcul
                  automatique des coûts et marges vous permet d'avoir une vision claire de la rentabilité de chaque
                  projet. Enfin, notre interface intuitive et personnalisable s'adapte parfaitement à vos besoins
                  spécifiques.
                </p>
              </div>
            </div>

            <div className={`faq-item ${isOpen === 2 ? "open" : ""}`}>
              <div className="faq-question" onClick={() => toggleFaq(2)}>
                <span>Puis-je utiliser OddnetCRM si je ne connais rien à la gestion commerciale ?</span>
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="faq-answer">
                <p>
                  Absolument ! Notre plateforme a été conçue pour être intuitive et facile à prendre en main, même sans
                  expérience préalable. Nous proposons également des tutoriels et un support client réactif pour vous
                  accompagner dans votre prise en main.
                </p>
              </div>
            </div>

            <div className={`faq-item ${isOpen === 3 ? "open" : ""}`}>
              <div className="faq-question" onClick={() => toggleFaq(3)}>
                <span>Mon projet est unique et ma situation particulière. OddnetCRM peut-il me correspondre ?</span>
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="faq-answer">
                <p>
                  OddnetCRM est hautement personnalisable et s'adapte à une grande variété de besoins. Nos options de
                  configuration vous permettent d'ajuster la plateforme à votre activité spécifique. Pour les besoins
                  très particuliers, notre équipe peut vous proposer des solutions sur mesure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Prêt à optimiser votre gestion commerciale ?</h2>
            <p>Rejoignez les entreprises qui ont déjà transformé leur approche commerciale</p>
            <Link to="/register" className="btn btn-primary btn-lg">
              Essayer maintenant
            </Link>
          </div>
        </div>
      </div>

      <div id="contact" className="contact-section">
        <div className="container">
          <div className="contact-container">
            <div className="contact-info">
              <h2>Contactez-nous pour toute question</h2>
              <p>
                Notre équipe d'experts est à votre disposition pour répondre à toutes vos questions concernant notre
                solution de gestion commerciale.
              </p>

              <div className="contact-details">
                <div className="contact-item">
                  <div className="contact-icon">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div className="contact-text">
                    <h3>Horaires</h3>
                    <p>Du lundi au vendredi, de 9h à 18h</p>
                  </div>
                </div>

                <div className="contact-item">
                  <div className="contact-icon">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <div className="contact-text">
                    <h3>Email</h3>
                    <p>contact@oddnetcrm.com</p>
                  </div>
                </div>

                <div className="contact-item">
                  <div className="contact-icon">
                    <i className="fas fa-phone"></i>
                  </div>
                  <div className="contact-text">
                    <h3>Téléphone</h3>
                    <p>06 11 95 58 23</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="contact-form">
              <h3>Envoyez-nous un message</h3>
              <form>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">Prénom</label>
                    <input type="text" id="firstName" placeholder="Votre prénom" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Nom</label>
                    <input type="text" id="lastName" placeholder="Votre nom" required />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" placeholder="Votre adresse email" required />
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea id="message" rows="5" placeholder="Votre message" required></textarea>
                </div>

                <button type="submit" className="btn btn-primary btn-lg">
                  Envoyer <i className="fas fa-paper-plane"></i>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <h2>
                Oddnet<span>CRM</span>
              </h2>
              <p>Solution de gestion commerciale intégrée avec Outlook</p>
            </div>
            <div className="footer-links">
              <div className="footer-links-column">
                <h3>Produit</h3>
                <ul>
                  <li>
                    <a href="#features">Fonctionnalités</a>
                  </li>
                  <li>
                    <a href="#pricing">Tarifs</a>
                  </li>
                  <li>
                    <a href="#why-us">Pourquoi nous</a>
                  </li>
                </ul>
              </div>
              <div className="footer-links-column">
                <h3>Ressources</h3>
                <ul>
                  <li>
                    <a href="#blog">Blog</a>
                  </li>
                  <li>
                    <a href="#documentation">Documentation</a>
                  </li>
                  <li>
                    <a href="#support">Support</a>
                  </li>
                </ul>
              </div>
              <div className="footer-links-column">
                <h3>Entreprise</h3>
                <ul>
                  <li>
                    <a href="#about">À propos</a>
                  </li>
                  <li>
                    <a href="#contact">Contact</a>
                  </li>
                  <li>
                    <a href="#careers">Carrières</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 OddnetCRM. Tous droits réservés.</p>
            <div className="footer-social">
              <a href="#facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#linkedin">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
