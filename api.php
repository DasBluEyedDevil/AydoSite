<?php
// Simple PHP API Proxy - Debug version with logging

// Enable debug mode 
define('DEBUG', true);

// Function to log debug messages
function debug_log($message) {
    if (DEBUG) {
        error_log("[API Proxy] " . $message);
    }
}

// Set appropriate headers for CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-auth-token");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get current path info
$request_uri = $_SERVER["REQUEST_URI"];
$path = parse_url($request_uri, PHP_URL_PATH);
$query = parse_url($request_uri, PHP_URL_QUERY);

debug_log("Request path: " . $path);

// Only process requests that start with /api/
if (strpos($path, "/api/") === 0) {
    // Extract the part after /api/
    $api_path = substr($path, 5); // Remove "/api/"
    
    // Forward to Node.js server
    $node_url = "http://localhost:8080/api/" . $api_path;
    if ($query) {
        $node_url .= "?" . $query;
    }
    
    debug_log("Forwarding to: " . $node_url);
    
    // Get request method and headers
    $method = $_SERVER["REQUEST_METHOD"];
    $headers = getallheaders();
    
    debug_log("Method: " . $method);
    
    // Set up cURL options
    $options = [
        CURLOPT_URL => $node_url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_TIMEOUT => 10, // Set timeout to 10 seconds
        CURLOPT_CONNECTTIMEOUT => 5, // Connection timeout of 5 seconds
    ];
    
    // Add headers
    $curl_headers = [];
    foreach ($headers as $key => $value) {
        if (!in_array(strtolower($key), ["host", "connection", "content-length"])) {
            $curl_headers[] = "$key: $value";
            debug_log("Forward header: $key: $value");
        }
    }
    
    // Add request body for POST/PUT/PATCH
    if ($method === "POST" || $method === "PUT" || $method === "PATCH") {
        $input = file_get_contents("php://input");
        $options[CURLOPT_POSTFIELDS] = $input;
        debug_log("Request body: " . substr($input, 0, 100) . (strlen($input) > 100 ? "..." : ""));
    }
    
    // Set headers if we have any
    if (!empty($curl_headers)) {
        $options[CURLOPT_HTTPHEADER] = $curl_headers;
    }
    
    // Initialize cURL
    $ch = curl_init();
    curl_setopt_array($ch, $options);
    
    // Execute cURL request
    $response = curl_exec($ch);
    $status_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    
    debug_log("Response status: " . $status_code);
    
    // Check for errors
    if ($error = curl_error($ch)) {
        debug_log("cURL error: " . $error);
        header("HTTP/1.1 500 Internal Server Error");
        echo json_encode([
            "error" => "Failed to connect to Node.js server",
            "details" => $error,
            "url" => $node_url
        ]);
        curl_close($ch);
        exit;
    }
    
    // Close cURL
    curl_close($ch);
    
    // Set proper content type based on response
    if (!empty($content_type)) {
        header("Content-Type: " . $content_type);
    }
    
    // Set response code
    http_response_code($status_code);
    
    // Output response
    echo $response;
} else {
    // Request does not match our proxy path
    debug_log("Invalid API path: " . $path);
    header("HTTP/1.1 404 Not Found");
    echo json_encode(["error" => "Invalid API endpoint", "path" => $path]);
}