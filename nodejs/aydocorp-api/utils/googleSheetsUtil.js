const { google } = require('googleapis');

/**
 * Google Sheets utility for reading and writing employee data
 */
class GoogleSheetsUtil {
  constructor() {
    this.sheets = null;
    this.initialized = false;
    this.employeeSheetId = process.env.GOOGLE_SHEETS_EMPLOYEE_ID;
    this.employeeSheetName = process.env.GOOGLE_SHEETS_EMPLOYEE_SHEET_NAME || 'Employees';
  }

  /**
   * Initialize the Google Sheets API client
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
        console.log('Successfully parsed Google credentials JSON');
      } catch (parseError) {
        console.error('Error parsing Google credentials JSON:', parseError);
        return Promise.reject(new Error('Invalid Google credentials JSON format. Please check your .env file.'));
      }

      // Validate required credential fields
      if (!credentials.client_email || !credentials.private_key) {
        console.error('Missing required fields in Google credentials:', 
          !credentials.client_email ? 'client_email is missing' : '',
          !credentials.private_key ? 'private_key is missing' : '');
        return Promise.reject(new Error('Google credentials are missing required fields (client_email and/or private_key)'));
      }

      // Create JWT client
      const auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
      );

      // Create sheets client
      this.sheets = google.sheets({ version: 'v4', auth });
      this.initialized = true;
      console.log('Google Sheets API initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Sheets API:', error);
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
   * Get sheet names from the spreadsheet
   * @returns {Array} Array of sheet names
   */
  async getSheetNames() {
    await this.ensureInitialized();

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.employeeSheetId,
        fields: 'sheets.properties'
      });

      return response.data.sheets.map(sheet => sheet.properties.title);
    } catch (error) {
      console.error('Error getting sheet names:', error);
      throw error;
    }
  }

  /**
   * Get all employees from the Google Sheet
   * @returns {Array} Array of employee objects
   */
  async getAllEmployees() {
    await this.ensureInitialized();

    try {
      // Get all sheet names
      const sheetNames = await this.getSheetNames();
      console.log('Available sheets:', sheetNames);

      // Check if the configured sheet name exists
      let sheetName = this.employeeSheetName;
      if (!sheetNames.includes(sheetName)) {
        console.warn(`Sheet "${sheetName}" not found. Available sheets: ${sheetNames.join(', ')}`);

        // Use the first sheet if the specified one doesn't exist
        if (sheetNames.length > 0) {
          sheetName = sheetNames[0];
          console.log(`Using first available sheet: "${sheetName}"`);
        } else {
          throw new Error('No sheets found in the spreadsheet');
        }
      }

      // Get the header row to determine column mapping
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.employeeSheetId,
        range: `${sheetName}!A1:Z1`,
      });

      const headers = headerResponse.data.values[0];

      // Get all data rows
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.employeeSheetId,
        range: `${sheetName}!A2:Z`,
      });

      const rows = response.data.values || [];

      // Convert rows to objects using headers as keys
      return rows.map(row => {
        const employee = {};
        headers.forEach((header, index) => {
          // Handle special fields
          if (header === 'specializations' || header === 'certifications') {
            employee[header] = row[index] ? row[index].split(',').map(item => item.trim()) : [];
          } else if (header === 'contactInfo') {
            // Assuming contactInfo is stored as JSON string
            try {
              employee[header] = row[index] ? JSON.parse(row[index]) : {};
            } catch (e) {
              employee[header] = {};
            }
          } else if (header === 'isActive') {
            employee[header] = row[index] === 'true';
          } else if (header === 'joinDate' || header === 'lastActive') {
            employee[header] = row[index] ? new Date(row[index]) : new Date();
          } else {
            employee[header] = row[index] || '';
          }
        });
        return employee;
      });
    } catch (error) {
      console.error('Error fetching employees from Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Get an employee by ID from the Google Sheet
   * @param {string} id - Employee ID
   * @returns {Object} Employee object
   */
  async getEmployeeById(id) {
    const employees = await this.getAllEmployees();
    return employees.find(employee => employee._id === id);
  }

  /**
   * Update the Google Sheet with the latest employee data from the database
   * @param {Array} employees - Array of employee objects from the database
   */
  async updateEmployeeSheet(employees) {
    await this.ensureInitialized();

    try {
      // Get all sheet names
      const sheetNames = await this.getSheetNames();

      // Check if the configured sheet name exists
      let sheetName = this.employeeSheetName;
      if (!sheetNames.includes(sheetName)) {
        console.warn(`Sheet "${sheetName}" not found for updating. Available sheets: ${sheetNames.join(', ')}`);

        // Use the first sheet if the specified one doesn't exist
        if (sheetNames.length > 0) {
          sheetName = sheetNames[0];
          console.log(`Using first available sheet for updating: "${sheetName}"`);
        } else {
          throw new Error('No sheets found in the spreadsheet for updating');
        }
      }

      // Define headers based on the Employee model
      const headers = [
        '_id', 'user', 'fullName', 'photo', 'backgroundStory', 'rank', 
        'department', 'joinDate', 'specializations', 'certifications', 
        'contactInfo', 'isActive', 'lastActive'
      ];

      // Create rows for each employee
      const rows = employees.map(employee => {
        return headers.map(header => {
          if (header === 'specializations' || header === 'certifications') {
            return Array.isArray(employee[header]) ? employee[header].join(', ') : '';
          } else if (header === 'contactInfo') {
            return JSON.stringify(employee[header] || {});
          } else if (header === 'isActive') {
            return employee[header] ? 'true' : 'false';
          } else if (header === 'joinDate' || header === 'lastActive') {
            return employee[header] ? new Date(employee[header]).toISOString() : '';
          } else if (header === 'user' && typeof employee[header] === 'object') {
            return employee[header]._id || employee[header].id || '';
          } else {
            return employee[header] ? employee[header].toString() : '';
          }
        });
      });

      // Add headers as the first row
      const values = [headers, ...rows];

      // Update the sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.employeeSheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        resource: { values },
      });

      console.log('Employee sheet updated successfully');
    } catch (error) {
      console.error('Error updating employee sheet:', error);
      throw error;
    }
  }

  /**
   * Sync employee data between the database and Google Sheet
   * @param {Array} dbEmployees - Array of employee objects from the database
   * @returns {Array} Updated array of employee objects
   */
  async syncEmployees(dbEmployees) {
    try {
      // Get employees from Google Sheet
      const sheetEmployees = await this.getAllEmployees();

      // Create a map of database employees by ID for quick lookup
      const dbEmployeeMap = new Map();
      dbEmployees.forEach(employee => {
        dbEmployeeMap.set(employee._id.toString(), employee);
      });

      // Create a map of sheet employees by ID for quick lookup
      const sheetEmployeeMap = new Map();
      sheetEmployees.forEach(employee => {
        if (employee._id) {
          sheetEmployeeMap.set(employee._id, employee);
        }
      });

      // Update database employees with data from sheet
      const updatedEmployees = [];

      // Process database employees
      dbEmployees.forEach(dbEmployee => {
        const id = dbEmployee._id.toString();
        const sheetEmployee = sheetEmployeeMap.get(id);

        if (sheetEmployee) {
          // Update database employee with sheet data
          const updatedEmployee = { ...dbEmployee.toObject() };

          // Update fields that can be edited in the sheet
          updatedEmployee.fullName = sheetEmployee.fullName || dbEmployee.fullName;
          updatedEmployee.backgroundStory = sheetEmployee.backgroundStory || dbEmployee.backgroundStory;
          updatedEmployee.rank = sheetEmployee.rank || dbEmployee.rank;
          updatedEmployee.department = sheetEmployee.department || dbEmployee.department;
          updatedEmployee.specializations = sheetEmployee.specializations || dbEmployee.specializations;
          updatedEmployee.certifications = sheetEmployee.certifications || dbEmployee.certifications;

          // Handle contactInfo separately as it's an object
          if (sheetEmployee.contactInfo) {
            updatedEmployee.contactInfo = {
              ...dbEmployee.contactInfo,
              ...sheetEmployee.contactInfo
            };
          }

          updatedEmployees.push(updatedEmployee);
        } else {
          // No changes from sheet, keep database version
          updatedEmployees.push(dbEmployee.toObject());
        }
      });

      // Find new employees from sheet that don't exist in database
      sheetEmployees.forEach(sheetEmployee => {
        // Skip if no ID or already in database
        if (!sheetEmployee._id || dbEmployeeMap.has(sheetEmployee._id)) {
          return;
        }

        // This is a new employee from the sheet, add to the list
        updatedEmployees.push(sheetEmployee);
      });

      // Update the sheet with the latest data
      await this.updateEmployeeSheet(updatedEmployees);

      return updatedEmployees;
    } catch (error) {
      console.error('Error syncing employees:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const googleSheetsUtil = new GoogleSheetsUtil();
module.exports = googleSheetsUtil;
