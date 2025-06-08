import MicrosoftGraphService from './microsoftGraphService';

class EmailNotificationService {
  constructor() {
    this.listeners = new Set();
    this.isPolling = false;
    this.pollInterval = null;
    this.lastEmails = [];
    this.graphService = new MicrosoftGraphService();
  }

  startEmailNotifications() {
    if (this.isPolling) return;

    this.isPolling = true;
    console.log("📧 Starting email notifications");

    // Initial check
    this.checkForNewEmails();

    // Check every 10 minutes
    this.pollInterval = setInterval(() => {
      this.checkForNewEmails();
    }, 10 * 60 * 500); // 10 minutes
  }

  stopEmailNotifications() {
    if (!this.isPolling) return;

    this.isPolling = false;
    console.log("📧 Stopping email notifications");

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async checkForNewEmails() {
    try {
      const emails = await this.graphService.getEmails();
      
      // Find new emails by comparing with last emails
      const newEmails = emails.filter(newEmail => 
        !this.lastEmails.some(lastEmail => lastEmail.id === newEmail.id)
      );

      if (newEmails.length > 0) {
        console.log(`📧 New emails detected: ${newEmails.length}`);
        
        // Notify listeners about new emails
        this.notifyListeners({
          type: "NEW_EMAILS",
          emails: newEmails,
          count: newEmails.length,
          timestamp: new Date()
        });
      }

      // Update last emails
      this.lastEmails = emails;
    } catch (error) {
      console.error("Error checking for new emails:", error);
    }
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error("Error in email notification listener:", error);
      }
    });
  }

  getStatus() {
    return {
      isPolling: this.isPolling,
      lastEmails: this.lastEmails,
      lastUpdate: new Date()
    };
  }
}

// Singleton instance
export const emailNotificationService = new EmailNotificationService();

export default emailNotificationService; 