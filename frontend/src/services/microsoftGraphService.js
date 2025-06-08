import axios from 'axios';

const BASE_URL = 'https://graph.microsoft.com/v1.0';

// Add your Microsoft Graph token here
const ACCESS_TOKEN = 'EwB4BMl6BAAUBKgm8k1UswUNwklmy2v7U/S+1fEAAe1rDEmQ2+YYq4vKe/AxVlu3ctnt/3SEY+ItxtzJgjZiyUde09MsrKHgkGIKwRX8C6T2timcm7pCo5RP2Ann48mL9yH1i+uMqcXIBSccfJ4WvRzhJI8aPH5D/a+ArGUJXA7LpXDCyd9PLbFifr7vxpV2/QqKFLSN9w6gEmwUOcub7y7AIHasgmGTzBMLW5r0rc8RYcTqGg7LeiPz20kDEskzURcYf8YjODYDkKDVaI3e4fBjCDe2DTVMRuGJodcnnCeD2kd5zhlyEjGkd2qAFScS1eugap0G/UMvpQpJtUJJXERPtAfHoZ8xDL6TJvAHZhjPsSP71ZvP+ZQaBfz5+ksQZgAAEMlGyMpCFg9zl4ADFkTzLIxAA3bewrKVWEXDB5Mg/IFUjmjb8B5ya/H3+gUIGZFpdpJHnzOgMt7C0yvJOJWJhsLzCcGRN29RETSnIfFBZlfw8uLkRe+4LPAjaiKgRh47DpxgxQzJHgqS7OComNFJpYBI/H0ntABc31g0FQKGChMVMpr2DORNsnHhUCjMZBWttmpkEH6op4PgetxYWSQ6SvmDKtFpsZsFeCZtzecAXp6m/GAus9F9ACCp6txchUudIuP7ATM0RFBaI+AiStASDXHPbPn38b6ZfYIANqXkh68UI2m0lidNMTNv5zDHRKshuQBoZkw9KQlXhn1JFUXQInqvuQsDT45T2pw+PGfi/6ys8Ipahl8mbYQrttQ+guDndh/Qdgr7NH2NvubQWiFX+OHxvsiw5jPehLgDzn8Cmn133o5NMpH57k8xg1iTBMcZ930rBbRKW2vdOW5M3IwdJ/+ZLBKgI5rqSUyoaHchCOuFMgB6IKaEioBPaSNMOtSNQkc/znhfxm0cGiB45cJ4NQWggFiBfPJGh2vTy8BUfHeO0IMzbf4mOebLLlMQ4QVTzcuL7HyOHeLe7bDMcxep7j6V07kA5EWJrZbQ35Qk7AeFPUW862PILhyH9nYQ6AkydUjTGD7ojkZ/jxFEec/dhGhZdrxEj4y4psIk4mJyuDIsAjR93eJpxwNgwMP5aE5GKSmQ/Zw/wdWvqweQzB/gHvcLf4c+bvLhlg+TVIOpzozxaN2grSymz+55yWFWpwgoKsXdSn51+Q4mF2aZ15EiIA60C3VFgv0u7By2Zp2feOh+bpegeTJG1h0kndJ63iJtPT50ZJj3IPkAFk547Wm4BszqdFsvdcrGdyv2lc3LQFQ/TQOLvw+vgbFcGcQgL6KCEDJb5OirEqTS8n8GSN0PN7FOUcr/V5YvNKsFSXuekAaxGEaZq4SCOK6Usz+o0t+VNjcuTmMtzVpr2uoQxJXRRJYDV1iNjji6e2nYktPI8vD9yti3quh8ExO1VYGpMjybeQAXfksh3vYblhbG2mzNe8Nd4OnwVyycquS1Op95SsWajaGDO2uNN6fLuu7YiX/bzkCQ2PTCPt8vxkVyfDZW7uAxXHCI1UtpImLNuRHujpku5zqHAw==';

class MicrosoftGraphService {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Get emails from inbox
  async getEmails(top = 50, skip = 0) {
    try {
      const response = await this.axiosInstance.get(`/me/messages`, {
        params: {
          $top: top,
          $skip: skip,
          $select: 'id,subject,from,receivedDateTime,bodyPreview,importance,hasAttachments,isRead,flag',
          $orderby: 'receivedDateTime desc'
        }
      });
      return response.data.value;
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  // Send email with attachments
  async sendEmail(emailData) {
    try {
      // First, create a draft message
      const draftMessage = {
        subject: emailData.subject,
        body: {
          contentType: "HTML",
          content: emailData.content
        },
        toRecipients: emailData.to.map(recipient => ({
          emailAddress: {
            address: recipient
          }
        })),
        ccRecipients: emailData.cc?.map(recipient => ({
          emailAddress: {
            address: recipient
          }
        })) || [],
        bccRecipients: emailData.bcc?.map(recipient => ({
          emailAddress: {
            address: recipient
          }
        })) || []
      };

      // Create the draft message
      const draftResponse = await this.axiosInstance.post('/me/messages', draftMessage);
      const messageId = draftResponse.data.id;

      // Handle attachments if any
      if (emailData.attachments && emailData.attachments.length > 0) {
        for (const file of emailData.attachments) {
          // Convert file to base64
          const base64Content = await this.fileToBase64(file);
          
          // Upload attachment
          await this.axiosInstance.post(`/me/messages/${messageId}/attachments`, {
            "@odata.type": "#microsoft.graph.fileAttachment",
            "name": file.name,
            "contentType": file.type,
            "contentBytes": base64Content.split(',')[1] // Remove the data URL prefix
          });
        }
      }

      // Send the message
      await this.axiosInstance.post(`/me/messages/${messageId}/send`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Helper method to convert File to base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  // Get email details with attachments
  async getEmailDetails(emailId) {
    try {
      // Get email details
      const response = await this.axiosInstance.get(`/me/messages/${emailId}`, {
        params: {
          $select: 'id,subject,from,receivedDateTime,body,importance,hasAttachments,isRead,flag,toRecipients,ccRecipients,bccRecipients,attachments'
        }
      });

      const email = response.data;

      // If email has attachments, get their details
      if (email.hasAttachments) {
        const attachmentsResponse = await this.axiosInstance.get(`/me/messages/${emailId}/attachments`);
        email.attachments = attachmentsResponse.data.value;
      }

      return email;
    } catch (error) {
      console.error('Error fetching email details:', error);
      throw error;
    }
  }

  // Update email (mark as read/unread, flag, etc.)
  async updateEmail(emailId, updates) {
    try {
      const response = await this.axiosInstance.patch(`/me/messages/${emailId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating email:', error);
      throw error;
    }
  }

  // Delete email
  async deleteEmail(emailId) {
    try {
      await this.axiosInstance.delete(`/me/messages/${emailId}`);
      return true;
    } catch (error) {
      console.error('Error deleting email:', error);
      throw error;
    }
  }

  // Download attachment
  async downloadAttachment(messageId, attachmentId) {
    try {
      // First get the attachment metadata to get the content type and name
      const metadataResponse = await this.axiosInstance.get(`/me/messages/${messageId}/attachments/${attachmentId}`);
      const attachment = metadataResponse.data;
      
      // Then get the actual file content
      const response = await this.axiosInstance.get(`/me/messages/${messageId}/attachments/${attachmentId}/$value`, {
        responseType: 'arraybuffer'
      });

      // Create blob with the correct content type
      const blob = new Blob([response.data], { type: attachment.contentType });
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw error;
    }
  }

  // Helper method to get file extension from content type
  getFileExtensionFromContentType(contentType) {
    const contentTypeMap = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'text/plain': 'txt',
      'text/csv': 'csv',
      'application/zip': 'zip',
      'application/x-rar-compressed': 'rar',
      'application/x-7z-compressed': '7z'
    };
    
    return contentTypeMap[contentType] || null;
  }
}

export default MicrosoftGraphService; 