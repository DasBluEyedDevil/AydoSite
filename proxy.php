<?php
// API Proxy Script for AydoCorp

// Set appropriate CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-auth-token");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the target URL from the query string
$url = isset($_GET['url']) ? $_GET['url'] : null;

// If no URL is provided, try to extract it from the request URI
if (!$url) {
    $requestUri = $_SERVER['REQUEST_URI'];
    // If the request starts with /api/, use that as our URL
    if (strpos($requestUri, '/api/') === 0) {
        $url = substr($requestUri, 1); // Remove the leading slash
    } else {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => 'Missing URL parameter and no API route detected']);
        exit;
    }
}

// Build the full URL to the Node.js backend
// Remove any leading slashes from the URL to prevent double slashes
$url = ltrim($url, '/');
// Change port from 3000 to 8080 to match test-api-users.js
$targetUrl = 'http://localhost:8080/' . $url;

// Log the target URL for debugging
error_log("Proxying request to: " . $targetUrl);

// Get the HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// Initialize cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

// Add headers
$headers = [];
foreach (getallheaders() as $name => $value) {
    if (strtolower($name) !== 'host' && strtolower($name) !== 'connection') {
        $headers[] = "$name: $value";
    }
}

if (!empty($headers)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
}

// Handle request body for POST, PUT, etc.
if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
    $inputData = file_get_contents('php://input');
    if (!empty($inputData)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $inputData);
    }
}

// Execute the request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

// Check for cURL errors
if (curl_errno($ch)) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode([
        'error' => 'Failed to connect to backend server',
        'details' => curl_error($ch)
    ]);
    curl_close($ch);
    exit;
}

// Close cURL resource
curl_close($ch);

// Forward the HTTP status code
http_response_code($httpCode);

// Set the content type header
if (!empty($contentType)) {
    header("Content-Type: $contentType");
}

// Output the response
echo $response;