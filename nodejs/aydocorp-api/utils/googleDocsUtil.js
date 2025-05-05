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
        console.error('Google API credentials not found in environment variables');
        return Promise.reject(new Error('Google API credentials not found in environment variables'));
      }

      // Parse credentials from environment variable
      let credentials;
      try {
        credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        console.log('Successfully parsed Google credentials JSON for Docs API');
      } catch (parseError) {
        console.error('Error parsing Google credentials JSON for Docs API:', parseError);
        return Promise.reject(new Error('Invalid Google credentials JSON format. Please check your .env file.'));
      }

      // Validate required credential fields
      if (!credentials.client_email || !credentials.private_key) {
        console.error('Missing required fields in Google credentials for Docs API:', 
          !credentials.client_email ? 'client_email is missing' : '',
          !credentials.private_key ? 'private_key is missing' : '');
        return Promise.reject(new Error('Google credentials are missing required fields (client_email and/or private_key)'));
      }

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
   * @returns {string} Document content as plain text with preserved line breaks
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
      let lastEndIndex = -1;

      if (document.body && document.body.content) {
        // Process each structural element in the document
        document.body.content.forEach(element => {
          // Handle paragraphs (most common element)
          if (element.paragraph) {
            // Add a newline between paragraphs, but not before the first one
            if (lastEndIndex !== -1) {
              content += '\n';
            }

            // Process paragraph elements (text runs)
            element.paragraph.elements.forEach(paraElement => {
              if (paraElement.textRun && paraElement.textRun.content) {
                content += paraElement.textRun.content;
              }
            });

            lastEndIndex = content.length;
          } 
          // Handle tables
          else if (element.table) {
            // Add a newline before the table if not at the beginning
            if (lastEndIndex !== -1) {
              content += '\n';
            }

            // Process table rows and cells
            element.table.tableRows.forEach(row => {
              let rowContent = '';

              // Extract text from each cell
              row.tableCells.forEach((cell, cellIndex) => {
                let cellContent = '';

                if (cell.content) {
                  cell.content.forEach(cellElement => {
                    if (cellElement.paragraph) {
                      cellElement.paragraph.elements.forEach(paraElement => {
                        if (paraElement.textRun && paraElement.textRun.content) {
                          cellContent += paraElement.textRun.content.trim();
                        }
                      });
                    }
                  });
                }

                // Add cell content with separator
                rowContent += cellContent;
                if (cellIndex < row.tableCells.length - 1) {
                  rowContent += ' | ';
                }
              });

              // Add row content
              content += rowContent + '\n';
            });

            lastEndIndex = content.length;
          }
          // Handle lists
          else if (element.list) {
            // Add a newline before the list if not at the beginning
            if (lastEndIndex !== -1) {
              content += '\n';
            }

            // Process list items
            if (element.list.listItems) {
              element.list.listItems.forEach(item => {
                let itemContent = '';

                // Add bullet or number
                if (item.bullet) {
                  itemContent += '• ';
                } else if (item.number) {
                  itemContent += item.number + '. ';
                }

                // Add item text
                if (item.text) {
                  itemContent += item.text;
                }

                content += itemContent + '\n';
              });
            }

            lastEndIndex = content.length;
          }
          // Handle section breaks
          else if (element.sectionBreak) {
            content += '\n---\n';
            lastEndIndex = content.length;
          }
        });
      }

      // Ensure consistent line breaks and remove extra whitespace
      content = content.replace(/\r\n/g, '\n')
                       .replace(/\r/g, '\n')
                       .replace(/\n{3,}/g, '\n\n')
                       .trim();

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
        console.error('Operations document ID not configured');
        return Promise.reject(new Error('Operations document ID not configured'));
      }

      console.log(`Fetching operations content from Google Doc ID: ${documentId}`);
      const content = await this.getDocumentContent(documentId);

      // Log a sample of the content for debugging (first 200 chars)
      console.log(`Retrieved document content (first 200 chars): ${content.substring(0, 200)}...`);
      console.log(`Total content length: ${content.length} characters`);

      // Parse the content into operation objects
      const operations = [];
      const sections = content.split('---OPERATION---').filter(Boolean);

      console.log(`Found ${sections.length} operation sections in the document`);

      sections.forEach((section, index) => {
        console.log(`Processing operation section ${index + 1}:`);
        console.log(`Section length: ${section.length} characters`);

        const lines = section.split('\n').filter(line => line.trim());
        console.log(`Found ${lines.length} non-empty lines in section ${index + 1}`);

        if (lines.length >= 3) {
          const title = lines[0].trim();
          const description = lines[1].trim();
          const content = lines.slice(2).join('\n').trim();

          console.log(`Parsed operation: "${title}" (description: ${description.substring(0, 30)}...)`);

          operations.push({
            title,
            description,
            content,
            category: 'document',
            classification: 'internal',
            status: 'active'
          });
        } else {
          console.warn(`Skipping section ${index + 1} because it has fewer than 3 lines (found ${lines.length})`);
          console.warn(`Section content preview: ${section.substring(0, 100)}...`);
        }
      });

      console.log(`Successfully parsed ${operations.length} operations from the document`);
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
        console.error('Career paths document ID not configured');
        return Promise.reject(new Error('Career paths document ID not configured'));
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
        console.error('Events document ID not configured');
        return Promise.reject(new Error('Events document ID not configured'));
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
