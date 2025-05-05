# AydoCorp API Scripts

This directory contains utility scripts for the AydoCorp API.

## populate-career-paths.js

This script populates the database with certification and rank information for the Employee Portal.

### Prerequisites

Before running the script, make sure you have:

1. Node.js installed
2. The required dependencies installed (`axios`)
3. A running instance of the AydoCorp API
4. An admin user account with appropriate permissions

### Configuration

The script uses environment variables from the `.env` file in the parent directory. Make sure the following variables are set:

- `API_URL`: The base URL of the API (defaults to `http://localhost:8080` if not set)
- `ADMIN_USERNAME`: The username of an admin account
- `ADMIN_PASSWORD`: The password for the admin account

### Running the Script

To run the script:

```bash
cd nodejs/aydocorp-api/scripts
npm install axios
node populate-career-paths.js
```

### What the Script Does

The script creates three career paths:

1. **General**: Contains general certifications applicable to all members
2. **AydoExpress**: Contains certifications specific to the AydoExpress subsidiary
3. **Empyrion Industries**: Contains certifications specific to the Empyrion Industries subsidiary

Each career path includes:

- A description of the department
- The rank hierarchy with detailed information about each rank
- Certifications with descriptions, requirements, and benefits

### Testing

After running the script, you can verify that the data was added correctly by:

1. Logging into the Employee Portal
2. Navigating to the Career Paths section
3. Checking that all three career paths are listed
4. Clicking on each career path to view its details
5. Verifying that the ranks, certifications, and other information are displayed correctly

## Troubleshooting

If you encounter any issues:

1. Check that the API is running and accessible
2. Verify that your admin credentials are correct
3. Check the console output for error messages
4. Ensure you have the necessary permissions to create career paths