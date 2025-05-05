# Google Sheets and Google Docs Integration Guide

This guide explains how to set up and use the Google Sheets and Google Docs integration for the Employee Portal.

## Overview

The Employee Portal now supports sourcing data from Google Sheets and Google Docs, allowing non-technical users to update content without modifying code. This integration enables:

1. **Employee Database**: Source employee data from a Google Sheet
2. **Operations, Career Paths, and Events**: Source content from Google Docs

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the following APIs:
   - Google Sheets API
   - Google Docs API
   - Google Drive API

### 2. Create a Service Account

1. In your Google Cloud project, go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Enter a name and description for the service account
4. Grant the following roles:
   - Google Sheets API: "Sheets Editor"
   - Google Docs API: "Docs Editor"
   - Google Drive API: "Drive File Viewer"
5. Click "Create Key" and select JSON format
6. Download the JSON key file

### 3. Set Up Google Sheets for Employee Data

1. Create a new Google Sheet
2. Add a sheet named "Employees" with the following columns:
   - _id (MongoDB ID)
   - user (User ID)
   - fullName
   - photo
   - backgroundStory
   - rank
   - department
   - joinDate
   - specializations (comma-separated)
   - certifications (comma-separated)
   - contactInfo (JSON string)
   - isActive
   - lastActive
3. Share the sheet with the service account email (with Editor permissions)
4. Copy the Sheet ID from the URL (the long string between /d/ and /edit in the URL)

### 4. Set Up Google Docs for Other Content

#### Operations Document

1. Create a new Google Doc for operations
2. Format the document with sections separated by "---OPERATION---"
3. For each operation section, include:
   - Title (first line)
   - Description (second line)
   - Content (remaining lines)
4. Share the document with the service account email (with Editor permissions)
5. Copy the Document ID from the URL

#### Career Paths Document

1. Create a new Google Doc for career paths
2. Format the document with sections separated by "---CAREER-PATH---"
3. For each career path section, include:
   - Department name (first line)
   - Description (second line)
   - Ranks section (starting with "---RANKS---")
   - For each rank, include a section starting with "---RANK---" followed by:
     - Title
     - Description
     - Level (number)
     - Paygrade
     - Responsibilities (comma-separated)
     - Requirements (comma-separated)
4. Share the document with the service account email (with Editor permissions)
5. Copy the Document ID from the URL

#### Events Document

1. Create a new Google Doc for events
2. Format the document with sections separated by "---EVENT---"
3. For each event section, include:
   - Title (first line)
   - Description (second line)
   - Event Type (third line, one of: mission, training, social, meeting, other)
   - Location (fourth line)
   - Start Date (fifth line, in ISO format: YYYY-MM-DD)
   - End Date (sixth line, optional, in ISO format: YYYY-MM-DD)
4. Share the document with the service account email (with Editor permissions)
5. Copy the Document ID from the URL

### 5. Update Environment Variables

Update your `.env` file with the following variables:

```
# Google API Configuration
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...} # Paste the entire contents of your service account JSON key file

# Google Sheets Document IDs
GOOGLE_SHEETS_EMPLOYEE_ID=your-google-sheets-id

# Google Docs Document IDs
GOOGLE_DOCS_OPERATIONS_ID=your-operations-doc-id
GOOGLE_DOCS_CAREER_PATHS_ID=your-career-paths-doc-id
GOOGLE_DOCS_EVENTS_ID=your-events-doc-id
```

## Usage

Once the integration is set up, the application will automatically:

1. Fetch employee data from the Google Sheet when the `/api/employee-portal/employees` endpoint is accessed
2. Fetch operations content from the Google Doc when the `/api/employee-portal/operations` endpoint is accessed
3. Fetch career paths content from the Google Doc when the `/api/employee-portal/career-paths` endpoint is accessed
4. Fetch events content from the Google Doc when the `/api/employee-portal/events` endpoint is accessed

### Updating Content

To update content:

1. **Employee Data**: Edit the Google Sheet directly. Changes will be reflected in the application the next time the employees endpoint is accessed.
2. **Operations, Career Paths, Events**: Edit the respective Google Docs. Changes will be reflected in the application the next time the corresponding endpoint is accessed.

## Troubleshooting

If you encounter issues with the integration:

1. Check that the service account has the correct permissions on the Google Sheets and Google Docs
2. Verify that the document IDs in the `.env` file are correct
3. Ensure the documents are formatted correctly according to the guidelines above
4. Check the server logs for any error messages related to the Google API integration

## Security Considerations

The service account credentials in the `.env` file provide access to your Google Sheets and Google Docs. Keep these credentials secure and never commit them to version control.