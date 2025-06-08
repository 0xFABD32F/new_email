"use client"

import { useState, useEffect, useRef } from "react"
import MicrosoftGraphService from '../../services/microsoftGraphService';
import './EmailInterface.css';

// Étiquettes disponibles
const labels = [
  { id: "important", name: "Important", color: "#e53935" },
  { id: "travail", name: "Travail", color: "#43a047" },
  { id: "personnel", name: "Personnel", color: "#1e88e5" },
  { id: "todo", name: "À faire", color: "#fb8c00" },
]

// Dossiers disponibles
const folders = [
  { name: "Boîte de réception", icon: "fas fa-inbox", count: 4 },
  { name: "Envoyés", icon: "fas fa-paper-plane", count: 0 },
  { name: "Brouillons", icon: "fas fa-file", count: 2 },
  { name: "Archivés", icon: "fas fa-archive", count: 0 },
]

// Composant pour un élément de la liste d'emails
const EmailListItem = ({ email, selected, onClick }) => {
  return (
    <>
      <div
        className={`email-list-item ${selected ? "selected" : ""} ${email.unread ? "unread" : ""}`}
        onClick={onClick}
      >
        <div className="email-list-item-content">
          <div className="email-actions">
            <button className={`star-button ${email.starred ? "starred" : ""}`}>
              <i className={email.starred ? "fas fa-star" : "far fa-star"}></i>
            </button>
          </div>

          <div className="email-avatar">
            <div className={`avatar ${email.unread ? "unread" : ""}`}>{email.avatar}</div>
          </div>

          <div className="email-details">
            <div className="email-header">
              <div className="email-sender">
                <span className={`sender-name ${email.unread ? "unread" : ""}`}>{email.from}</span>
                <span className="company-badge">{email.company}</span>
                {email.labels.map((labelId) => {
                  const label = labels.find((l) => l.id === labelId)
                  return label ? (
                    <span
                      key={labelId}
                      className="email-label"
                      style={{
                        backgroundColor: `${label.color}20`,
                        color: label.color,
                      }}
                    >
                      {label.name}
                    </span>
                  ) : null
                })}
              </div>
              <div className="email-time">
                {email.hasAttachments && <i className="fas fa-paperclip attachment-icon"></i>}
                <span>{email.date}</span>
              </div>
            </div>
            <div className={`email-subject ${email.unread ? "unread" : ""}`}>{email.subject}</div>
            <div className="email-preview">{email.preview}</div>
          </div>
        </div>
      </div>
      <div className="divider"></div>
    </>
  )
}

// Composant pour la boîte de dialogue de composition d'email
const ComposeEmailDialog = ({ open, onClose, replyTo, mode }) => {
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  // Initialize Microsoft Graph service
  const graphService = new MicrosoftGraphService()

  useEffect(() => {
    if (open && replyTo) {
      if (mode === "reply") {
        setTo(replyTo.email)
        setSubject(`Re: ${replyTo.subject}`)
        setContent(`\n\n\n---\nLe ${new Date().toLocaleString()}, ${replyTo.from} a écrit :\n\n${replyTo.preview}`)
      } else if (mode === "replyAll") {
        setTo(replyTo.email)
        setCc("") // Add other recipients from original email
        setSubject(`Re: ${replyTo.subject}`)
        setContent(`\n\n\n---\nLe ${new Date().toLocaleString()}, ${replyTo.from} a écrit :\n\n${replyTo.preview}`)
      } else if (mode === "forward") {
        setSubject(`Tr: ${replyTo.subject}`)
        setContent(
          `\n\n\n---\nMessage transféré :\nDe : ${replyTo.from}\nDate : ${new Date().toLocaleString()}\nObjet : ${replyTo.subject}\n\n${replyTo.preview}`,
        )
      }
    } else {
      setTo("")
      setCc("")
      setBcc("")
      setSubject("")
      setContent("")
      setError(null)
    }
  }, [open, replyTo, mode])

  const handleSend = async (e) => {
    e.preventDefault()
    setSending(true)
    setError(null)

    try {
      // Prepare email data
      const emailData = {
        subject: subject,
        content: content,
        to: to.split(',').map(e => e.trim()),
        cc: cc ? cc.split(',').map(e => e.trim()) : [],
        bcc: bcc ? bcc.split(',').map(e => e.trim()) : [],
        attachments: attachments // Include attachments in the email data
      }

      // Send email using Microsoft Graph API
      await graphService.sendEmail(emailData)
      
      // Close dialog and reset form
    onClose()
      setSending(false)
    } catch (err) {
      console.error('Error sending email:', err)
      setError('Failed to send email. Please try again.')
      setSending(false)
    }
  }

  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  if (!open) return null

  return (
    <div className="compose-email-overlay">
      <div className="compose-email-dialog">
        <div className="compose-email-header">
          <h3>
            {mode === "new"
              ? "Nouveau message"
              : mode === "reply"
                ? "Répondre"
                : mode === "replyAll"
                  ? "Répondre à tous"
                  : "Transférer"}
          </h3>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="compose-email-body">
          <form onSubmit={handleSend}>
            <div className="compose-form-group">
              <label htmlFor="to">À :</label>
              <input 
                type="text" 
                id="to" 
                value={to} 
                onChange={(e) => setTo(e.target.value)} 
                required 
                placeholder="recipient@example.com"
              />
            </div>

            {showCc && (
              <div className="compose-form-group">
                <label htmlFor="cc">Cc :</label>
                <input 
                  type="text" 
                  id="cc" 
                  value={cc} 
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                />
              </div>
            )}

            {showBcc && (
              <div className="compose-form-group">
                <label htmlFor="bcc">Cci :</label>
                <input 
                  type="text" 
                  id="bcc" 
                  value={bcc} 
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                />
              </div>
            )}

            <div className="compose-form-actions">
              {!showCc && (
                <button type="button" className="text-button" onClick={() => setShowCc(true)}>
                  Ajouter Cc
                </button>
              )}
              {!showBcc && (
                <button type="button" className="text-button" onClick={() => setShowBcc(true)}>
                  Ajouter Cci
                </button>
              )}
            </div>

            <div className="compose-form-group">
              <label htmlFor="subject">Objet :</label>
              <input 
                type="text" 
                id="subject" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                required 
                placeholder="Subject"
              />
            </div>

            <div className="compose-form-group">
              <div className="formatting-toolbar">
                <button type="button" className="format-button">
                  <i className="fas fa-bold"></i>
                </button>
                <button type="button" className="format-button">
                  <i className="fas fa-italic"></i>
                </button>
                <button type="button" className="format-button">
                  <i className="fas fa-underline"></i>
                </button>
                <span className="divider-vertical"></span>
                <button type="button" className="format-button">
                  <i className="fas fa-list-ul"></i>
                </button>
                <button type="button" className="format-button">
                  <i className="fas fa-list-ol"></i>
                </button>
                <button type="button" className="format-button">
                  <i className="fas fa-quote-right"></i>
                </button>
                <span className="divider-vertical"></span>
                <button type="button" className="format-button">
                  <i className="fas fa-link"></i>
                </button>
                <button type="button" className="format-button">
                  <i className="fas fa-image"></i>
                </button>
              </div>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                required
                placeholder="Write your message here..."
              ></textarea>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {attachments.length > 0 && (
              <div className="attachments-container">
                <h4>Pièces jointes</h4>
                <div className="attachments-list">
                  {attachments.map((file, index) => (
                    <div key={index} className="attachment-item">
                      <i className="fas fa-paperclip"></i>
                      <span>{file.name}</span>
                      <button type="button" className="remove-attachment" onClick={() => handleRemoveAttachment(index)}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="compose-form-actions">
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={sending}
              >
                {sending ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Envoi en cours...
                  </>
                ) : (
                  <>
                <i className="fas fa-paper-plane"></i> Envoyer
                  </>
                )}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: "none" }} 
                multiple 
                onChange={handleFileChange} 
              />
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleAttachmentClick}
              >
                <i className="fas fa-paperclip"></i> Joindre
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Add this component for displaying attachments
const AttachmentList = ({ attachments, messageId, onDownload }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="attachments-container">
      <h4>Pièces jointes</h4>
      <div className="attachments-list">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="attachment-item">
            <i className={`fas ${getAttachmentIcon(attachment.contentType)}`}></i>
            <span className="attachment-name">{attachment.name}</span>
            <span className="attachment-size">({formatFileSize(attachment.size)})</span>
            <button
              className="download-attachment"
              onClick={() => onDownload(messageId, attachment.id)}
              title="Télécharger"
            >
              <i className="fas fa-download"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to get icon based on file type
const getAttachmentIcon = (contentType) => {
  if (contentType.startsWith('image/')) return 'fa-image';
  if (contentType.startsWith('video/')) return 'fa-video';
  if (contentType.startsWith('audio/')) return 'fa-music';
  if (contentType.includes('pdf')) return 'fa-file-pdf';
  if (contentType.includes('word')) return 'fa-file-word';
  if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'fa-file-excel';
  if (contentType.includes('powerpoint') || contentType.includes('presentation')) return 'fa-file-powerpoint';
  if (contentType.includes('zip') || contentType.includes('compressed')) return 'fa-file-archive';
  return 'fa-file';
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Composant principal de l'interface email
function EmailInterface() {
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [sortBy, setSortBy] = useState("date")
  const [viewMode, setViewMode] = useState("comfortable")
  const [composeDialogOpen, setComposeDialogOpen] = useState(false)
  const [composeMode, setComposeMode] = useState("new")
  const [replyToEmail, setReplyToEmail] = useState(null)
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [activeFolder, setActiveFolder] = useState("Boîte de réception")
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedEmailDetails, setSelectedEmailDetails] = useState(null);
  const [downloadingAttachment, setDownloadingAttachment] = useState(false);

  // Initialize Microsoft Graph service with your token
  const graphService = new MicrosoftGraphService('YOUR_ACCESS_TOKEN_HERE')

  useEffect(() => {
    fetchEmails()
  }, [])

  const fetchEmails = async () => {
    try {
      setLoading(true)
      const fetchedEmails = await graphService.getEmails()
      setEmails(fetchedEmails.map(email => {
        const fromName = email.from?.emailAddress?.name || 'Unknown Sender'
        const fromEmail = email.from?.emailAddress?.address || ''
        return {
        id: email.id,
          from: fromName,
          email: fromEmail,
          company: fromEmail.split('@')[1] || '',
          subject: email.subject || 'No Subject',
          preview: email.bodyPreview || '',
        date: new Date(email.receivedDateTime).toLocaleTimeString(),
        unread: !email.isRead,
        starred: email.flag?.flagStatus === 'flagged',
          avatar: fromName.split(' ').map(n => n[0]).join('').toUpperCase(),
        hasAttachments: email.hasAttachments,
        labels: email.importance === 'high' ? ['important'] : [],
        priority: email.importance
        }
      }))
      setLoading(false)
    } catch (err) {
      setError('Failed to fetch emails')
      setLoading(false)
      console.error(err)
    }
  }

  const handleSend = async (emailData) => {
    try {
      await graphService.sendEmail({
        subject: emailData.subject,
        content: emailData.content,
        to: emailData.to.split(',').map(e => e.trim()),
        cc: emailData.cc ? emailData.cc.split(',').map(e => e.trim()) : [],
        bcc: emailData.bcc ? emailData.bcc.split(',').map(e => e.trim()) : [],
        attachments: emailData.attachments
      })
      setComposeDialogOpen(false)
      fetchEmails() // Refresh the email list
    } catch (err) {
      console.error('Error sending email:', err)
      // Handle error (show notification, etc.)
    }
  }

  const handleEmailClick = async (emailId) => {
    try {
      const emailDetails = await graphService.getEmailDetails(emailId);
      setSelectedEmail(emailId);
      setSelectedEmailDetails(emailDetails);
      setShowRightPanel(true);
      
      // Mark as read if unread
      if (!emailDetails.isRead) {
        await graphService.updateEmail(emailId, { isRead: true });
        fetchEmails(); // Refresh the email list
      }
    } catch (err) {
      console.error('Error fetching email details:', err);
    }
  };

  const handleDeleteEmail = async (emailId) => {
    try {
      await graphService.deleteEmail(emailId)
      setShowRightPanel(false)
      setSelectedEmail(null)
      fetchEmails() // Refresh the email list
    } catch (err) {
      console.error('Error deleting email:', err)
    }
  }

  const handleCloseRightPanel = () => {
    setShowRightPanel(false)
    setSelectedEmail(null)
  }

  const handleCompose = () => {
    setComposeMode("new")
    setReplyToEmail(null)
    setComposeDialogOpen(true)
  }

  const handleReply = () => {
    const email = emails.find((e) => e.id === selectedEmail)
    setComposeMode("reply")
    setReplyToEmail(email)
    setComposeDialogOpen(true)
  }

  const handleReplyAll = () => {
    const email = emails.find((e) => e.id === selectedEmail)
    setComposeMode("replyAll")
    setReplyToEmail(email)
    setComposeDialogOpen(true)
  }

  const handleForward = () => {
    const email = emails.find((e) => e.id === selectedEmail)
    setComposeMode("forward")
    setReplyToEmail(email)
    setComposeDialogOpen(true)
  }

  const handleViewModeChange = () => {
    setViewMode((prev) => (prev === "comfortable" ? "compact" : "comfortable"))
  }

  const handleSortChange = (value) => {
    setSortBy(value)
  }

  const sortedEmails = [...emails].sort((a, b) => {
    if (sortBy === "priority") {
      return a.priority === "high" ? -1 : 1
    }
    return 0 // Tri par date par défaut
  })

  const selectedEmailData = emails.find((e) => e.id === selectedEmail)

  const handleDownloadAttachment = async (messageId, attachmentId) => {
    try {
      setDownloadingAttachment(true);
      await graphService.downloadAttachment(messageId, attachmentId);
    } catch (err) {
      console.error('Error downloading attachment:', err);
    } finally {
      setDownloadingAttachment(false);
    }
  };

  return (
    <div className="email-interface">
      {/* Panneau de gauche - Liste des dossiers */}
      <div className="email-sidebar">
        <div className="sidebar-header">
          <h3>Email</h3>
        </div>
        <div className="compose-button-container">
          <button className="compose-button" onClick={handleCompose}>
            <i className="fas fa-plus"></i> Nouveau message
          </button>
        </div>
        <div className="folders-list">
          {folders.map((folder, index) => (
            <div
              key={index}
              className={`folder-item ${activeFolder === folder.name ? "active" : ""}`}
              onClick={() => setActiveFolder(folder.name)}
            >
              <i className={folder.icon}></i>
              <span>{folder.name}</span>
              {folder.count > 0 && <span className="folder-count">{folder.count}</span>}
            </div>
          ))}
        </div>
        <div className="labels-section">
          <h4>Étiquettes</h4>
          <div className="labels-list">
            {labels.map((label) => (
              <div key={label.id} className="label-item">
                <span className="label-color" style={{ backgroundColor: label.color }}></span>
                <span>{label.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau central - Liste des emails */}
      <div className={`email-list-panel ${showRightPanel ? "with-detail" : ""}`}>
        <div className="email-toolbar">
          <div className="toolbar-left">
            {showSearch ? (
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Rechercher des emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button className="clear-search" onClick={() => setShowSearch(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ) : (
              <>
                <button className="toolbar-button" onClick={() => setShowSearch(true)}>
                  <i className="fas fa-search"></i>
                </button>
                <div className="sort-buttons">
                  <button
                    className={`sort-button ${sortBy === "date" ? "active" : ""}`}
                    onClick={() => handleSortChange("date")}
                  >
                    <i className="fas fa-clock"></i> Date
                  </button>
                  <button
                    className={`sort-button ${sortBy === "priority" ? "active" : ""}`}
                    onClick={() => handleSortChange("priority")}
                  >
                    <i className="fas fa-tag"></i> Priorité
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="toolbar-right">
            <button
              className="toolbar-button"
              onClick={handleViewModeChange}
              title={viewMode === "comfortable" ? "Vue compacte" : "Vue confortable"}
            >
              <i className={`fas fa-${viewMode === "comfortable" ? "list" : "th-large"}`}></i>
            </button>
            <button className="toolbar-button" title="Filtrer">
              <i className="fas fa-filter"></i>
            </button>
            <button className="toolbar-button" title="Plus d'actions">
              <i className="fas fa-ellipsis-v"></i>
            </button>
          </div>
        </div>

        <div className={`email-list ${viewMode}`}>
          {loading ? (
            <div className="loading">Loading emails...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            sortedEmails.map((email) => (
            <EmailListItem
              key={email.id}
              email={email}
              selected={selectedEmail === email.id}
              onClick={() => handleEmailClick(email.id)}
            />
            ))
          )}
        </div>
      </div>

      {/* Panneau de droite - Détail de l'email */}
      {showRightPanel && selectedEmailDetails && (
        <div className="email-detail-panel">
          <div className="detail-toolbar">
            <div className="toolbar-left">
              <button className="btn btn-primary" onClick={handleReply}>
                <i className="fas fa-reply"></i> Répondre
              </button>
              <button className="btn btn-outline" onClick={handleReplyAll}>
                <i className="fas fa-reply-all"></i> Répondre à tous
              </button>
              <button className="btn btn-outline" onClick={handleForward}>
                <i className="fas fa-share"></i> Transférer
              </button>
            </div>
            <div className="toolbar-right">
              <button className="toolbar-button" onClick={handleCloseRightPanel} title="Fermer">
                <i className="fas fa-times"></i>
              </button>
              <button className="toolbar-button" title="Imprimer">
                <i className="fas fa-print"></i>
              </button>
              <button className="toolbar-button" title="Archiver">
                <i className="fas fa-archive"></i>
              </button>
              <button className="toolbar-button delete" title="Supprimer" onClick={() => handleDeleteEmail(selectedEmailDetails.id)}>
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <div className="email-detail-content">
            <div className="email-detail-header">
              <h2 className="email-subject">{selectedEmailDetails.subject}</h2>

              <div className="email-sender-info">
                <div className="sender-avatar">
                  <div className="avatar">
                    {selectedEmailDetails.from.emailAddress.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                </div>
                <div className="sender-details">
                  <div className="sender-name">{selectedEmailDetails.from.emailAddress.name}</div>
                  <div className="sender-email">
                    <span>{selectedEmailDetails.from.emailAddress.address}</span>
                    <span className="dot-separator"></span>
                    <span>{new Date(selectedEmailDetails.receivedDateTime).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Display attachments if any */}
            {selectedEmailDetails.hasAttachments && (
              <AttachmentList
                attachments={selectedEmailDetails.attachments}
                messageId={selectedEmailDetails.id}
                onDownload={handleDownloadAttachment}
              />
            )}

            <div className="email-detail-body">
              <div dangerouslySetInnerHTML={{ __html: selectedEmailDetails.body.content }} />
            </div>
          </div>
        </div>
      )}

      {/* Boîte de dialogue de composition d'email */}
      <ComposeEmailDialog
        open={composeDialogOpen}
        onClose={() => setComposeDialogOpen(false)}
        replyTo={replyToEmail}
        mode={composeMode}
      />
    </div>
  )
}

export default EmailInterface