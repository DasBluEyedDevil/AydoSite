const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Google Sheets utility for reading and writing employee data
 */
class GoogleSheetsUtil {
  constructor() {
    this.sheets = null;
    this.initialized = false;
    this.employeeSheetId = process.env.GOOGLE_SHEETS_EMPLOYEE_ID;
  }

  /**
   * Initialize the Google Sheets API client
   */
  async initialize() {
    try {
      // Check if credentials exist
      if (!process.env.GOOGLE_CREDENTIALS_JSON) {
        throw new Error('Google API credentials not found in environment variables');
      }

      // Parse credentials from environment variable
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      
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
   * Get all employees from the Google Sheet
   * @returns {Array} Array of employee objects
   */
  async getAllEmployees() {
    await this.ensureInitialized();

    try {
      // Get the header row to determine column mapping
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.employeeSheetId,
        range: 'Employees!A1:Z1',
      });

      const headers = headerResponse.data.values[0];
      
      // Get all data rows
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.employeeSheetId,
        range: 'Employees!A2:Z',
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
        range: 'Employees!A1',
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