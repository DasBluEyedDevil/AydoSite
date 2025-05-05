const { google } = require('googleapis');

/**
 * Google Docs utility for reading and writing content for Employee Portal pages
 */
class GoogleDocsUtil {
  constructor() {
    this.docs = null;
    this.drive = null;
    this.initialized = false;
    
    // Map of document IDs for different content types
    this.documentIds = {
      operations: process.env.GOOGLE_DOCS_OPERATIONS_ID,
      careerPaths: process.env.GOOGLE_DOCS_CAREER_PATHS_ID,
      events: process.env.GOOGLE_DOCS_EVENTS_ID
    };
  }

  /**
   * Initialize the Google Docs API client
   */
  async initialize() {
    try {
      // Check if credentials exist
      if (!process.env.GOOGLE_CREDENTIALS_JSON) {
        throw new Error('Google API credentials not found in environment variables');
      }

      // Parse credentials from environment variable
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      
      // Create JWT client with scopes for both Docs and Drive
      const auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive.readonly'
        ]
      );

      // Create docs and drive clients
      this.docs = google.docs({ version: 'v1', auth });
      this.drive = google.drive({ version: 'v3', auth });
      this.initialized = true;
      console.log('Google Docs API initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Docs API:', error);
      throw error;
    }
  }

  /**
   * Ensure the API client is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get document content from Google Docs
   * @param {string} documentId - Google Docs document ID
   * @returns {string} Document content as HTML
   */
  async getDocumentContent(documentId) {
    await this.ensureInitialized();

    try {
      // Get the document
      const response = await this.docs.documents.get({
        documentId: documentId
      });

      // Extract text content from the document
      const document = response.data;
      let content = '';

      if (document.body && document.body.content) {
        // Process each structural element in the document
        document.body.content.forEach(element => {
          if (element.paragraph) {
            // Process paragraphs
            element.paragraph.elements.forEach(paraElement => {
              if (paraElement.textRun && paraElement.textRun.content) {
                content += paraElement.textRun.content;
              }
            });
          } else if (element.table) {
            // Process tables (simplified)
            content += '<table>';
            element.table.tableRows.forEach(row => {
              content += '<tr>';
              row.tableCells.forEach(cell => {
                content += '<td>';
                if (cell.content) {
                  cell.content.forEach(cellElement => {
                    if (cellElement.paragraph) {
                      cellElement.paragraph.elements.forEach(paraElement => {
                        if (paraElement.textRun && paraElement.textRun.content) {
                          content += paraElement.textRun.content;
                        }
                      });
                    }
                  });
                }
                content += '</td>';
              });
              content += '</tr>';
            });
            content += '</table>';
          }
        });
      }

      return content;
    } catch (error) {
      console.error(`Error fetching document content for ID ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get operations content from Google Docs
   * @returns {Array} Array of operation objects parsed from the document
   */
  async getOperationsContent() {
    try {
      const documentId = this.documentIds.operations;
      if (!documentId) {
        throw new Error('Operations document ID not configured');
      }

      const content = await this.getDocumentContent(documentId);
      
      // Parse the content into operation objects
      // This is a simplified example - actual parsing would depend on document structure
      const operations = [];
      const sections = content.split('---OPERATION---').filter(Boolean);
      
      sections.forEach(section => {
        const lines = section.split('\n').filter(line => line.trim());
        
        if (lines.length >= 3) {
          const title = lines[0].trim();
          const description = lines[1].trim();
          const content = lines.slice(2).join('\n').trim();
          
          operations.push({
            title,
            description,
            content,
            category: 'document',
            classification: 'internal',
            status: 'active'
          });
        }
      });
      
      return operations;
    } catch (error) {
      console.error('Error getting operations content:', error);
      throw error;
    }
  }

  /**
   * Get career paths content from Google Docs
   * @returns {Array} Array of career path objects parsed from the document
   */
  async getCareerPathsContent() {
    try {
      const documentId = this.documentIds.careerPaths;
      if (!documentId) {
        throw new Error('Career paths document ID not configured');
      }

      const content = await this.getDocumentContent(documentId);
      
      // Parse the content into career path objects
      // This is a simplified example - actual parsing would depend on document structure
      const careerPaths = [];
      const sections = content.split('---CAREER-PATH---').filter(Boolean);
      
      sections.forEach(section => {
        const lines = section.split('\n').filter(line => line.trim());
        
        if (lines.length >= 3) {
          const department = lines[0].trim();
          const description = lines[1].trim();
          
          // Parse ranks
          const ranksSection = section.split('---RANKS---')[1];
          const ranks = [];
          
          if (ranksSection) {
            const rankLines = ranksSection.split('---RANK---').filter(Boolean);
            rankLines.forEach(rankLine => {
              const rankParts = rankLine.split('\n').filter(line => line.trim());
              if (rankParts.length >= 3) {
                ranks.push({
                  title: rankParts[0].trim(),
                  description: rankParts[1].trim(),
                  level: parseInt(rankParts[2].trim()) || 1,
                  paygrade: rankParts[3]?.trim() || 'Standard',
                  responsibilities: rankParts[4]?.trim().split(',').map(r => r.trim()) || [],
                  requirements: rankParts[5]?.trim().split(',').map(r => r.trim()) || []
                });
              }
            });
          }
          
          careerPaths.push({
            department,
            description,
            ranks
          });
        }
      });
      
      return careerPaths;
    } catch (error) {
      console.error('Error getting career paths content:', error);
      throw error;
    }
  }

  /**
   * Get events content from Google Docs
   * @returns {Array} Array of event objects parsed from the document
   */
  async getEventsContent() {
    try {
      const documentId = this.documentIds.events;
      if (!documentId) {
        throw new Error('Events document ID not configured');
      }

      const content = await this.getDocumentContent(documentId);
      
      // Parse the content into event objects
      // This is a simplified example - actual parsing would depend on document structure
      const events = [];
      const sections = content.split('---EVENT---').filter(Boolean);
      
      sections.forEach(section => {
        const lines = section.split('\n').filter(line => line.trim());
        
        if (lines.length >= 5) {
          const title = lines[0].trim();
          const description = lines[1].trim();
          const eventType = lines[2].trim().toLowerCase();
          const location = lines[3].trim();
          const startDate = new Date(lines[4].trim());
          const endDate = lines[5] ? new Date(lines[5].trim()) : null;
          
          events.push({
            title,
            description,
            eventType: ['mission', 'training', 'social', 'meeting', 'other'].includes(eventType) ? eventType : 'other',
            location,
            startDate,
            endDate,
            isRecurring: false,
            maxAttendees: 0,
            requirements: '',
            isPrivate: false
          });
        }
      });
      
      return events;
    } catch (error) {
      console.error('Error getting events content:', error);
      throw error;
    }
  }

  /**
   * List all Google Docs in a specific folder
   * @param {string} folderId - Google Drive folder ID
   * @returns {Array} Array of document metadata
   */
  async listDocumentsInFolder(folderId) {
    await this.ensureInitialized();

    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document'`,
        fields: 'files(id, name, description, createdTime, modifiedTime)'
      });

      return response.data.files;
    } catch (error) {
      console.error(`Error listing documents in folder ${folderId}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
const googleDocsUtil = new GoogleDocsUtil();
module.exports = googleDocsUtil;