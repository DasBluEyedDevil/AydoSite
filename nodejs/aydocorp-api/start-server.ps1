# start-server.ps1
# PowerShell script to start the AydoCorp API server

# Set environment variables
$env:PORT = 3001

Write-Host "AydoCorp API Server Starter" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "This script will help you start the AydoCorp API server on port 3001." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "Node.js detected: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "Error: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if required modules are installed
Write-Host "Checking for required Node.js modules..." -ForegroundColor Yellow
cd $PSScriptRoot
if (-not (Test-Path -Path "node_modules")) {
    Write-Host "Node modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error installing dependencies. Please run 'npm install' manually." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Dependencies installed successfully." -ForegroundColor Green
}
else {
    Write-Host "Node modules directory found." -ForegroundColor Green
}

# Offer server start options
Write-Host ""
Write-Host "Select server start option:" -ForegroundColor Cyan
Write-Host "1. Start regular server (server.js)" -ForegroundColor White
Write-Host "2. Start minimal server (minimal-server.js) - use this if the regular server has issues" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1 or 2)"

switch ($choice) {
    "1" {
        Write-Host "Starting regular server on port 3001..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
        node server.js
    }
    "2" {
        Write-Host "Starting minimal server on port 3001..." -ForegroundColor Green
        Write-Host "Note: This is a reduced functionality version with only basic endpoints." -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
        node minimal-server.js
    }
    default {
        Write-Host "Invalid choice. Please run the script again and select 1 or 2." -ForegroundColor Red
        exit 1
    }
} 