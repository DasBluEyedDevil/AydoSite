<?php
// Simple PHP API Proxy with improved token handling

// Set appropriate headers for CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-auth-token");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Log function (for debugging)
function log_debug($message) {
    if (defined('DEBUG') && DEBUG) {
        error_log("[API Proxy] " . $message);
    }
}

// Get current path info
$request_uri = $_SERVER["REQUEST_URI"];
$path = parse_url($request_uri, PHP_URL_PATH);
$query = parse_url($request_uri, PHP_URL_QUERY);

// Only process requests that start with /api/
if (strpos($path, "/api/") === 0) {
    // Extract the part after /api/
    $api_path = substr($path, 5); // Remove "/api/"
    
    // Forward to Node.js server
    $node_url = "http://localhost:8080/api/" . $api_path;
    if ($query) {
        $node_url .= "?" . $query;
    }
    
    log_debug("Forwarding to: " . $node_url);
    
    // Get request method and headers
    $method = $_SERVER["REQUEST_METHOD"];
    $headers = getallheaders();
    
    log_debug("Method: " . $method);
    
    // Set up cURL options
    $options = [
        CURLOPT_URL => $node_url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CUSTOMREQUEST => $method,
    ];
    
    // Add headers
    $curl_headers = [];
    foreach ($headers as $key => $value) {
        if (!in_array(strtolower($key), ["host", "connection", "content-length"])) {
            $curl_headers[] = "$key: $value";
            log_debug("Forward header: $key: $value");
        }
    }
    
    // Extract token from cookies or auth header if present
    $token = null;
    if (isset($_COOKIE['aydocorpToken'])) {
        $token = $_COOKIE['aydocorpToken'];
    } else if (isset($headers['Authorization'])) {
        // Extract token from Authorization header if it's a Bearer token
        $auth = $headers['Authorization'];
        if (strpos($auth, 'Bearer ') === 0) {
            $token = substr($auth, 7);
        }
    } else if (isset($headers['x-auth-token'])) {
        $token = $headers['x-auth-token'];
    }
    
    // Add token to headers if found
    if ($token) {
        $curl_headers[] = "Authorization: Bearer " . $token;
        $curl_headers[] = "x-auth-token: " . $token;
        log_debug("Added token to headers");
    }
    
    // Add request body for POST/PUT/PATCH
    if ($method === "POST" || $method === "PUT" || $method === "PATCH") {
        $input = file_get_contents("php://input");
        $options[CURLOPT_POSTFIELDS] = $input;
        log_debug("Request body: " . substr($input, 0, 100) . (strlen($input) > 100 ? "..." : ""));
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
    
    log_debug("Response status: " . $status_code);
    
    // Check for errors
    if ($error = curl_error($ch)) {
        log_debug("cURL error: " . $error);
        header("HTTP/1.1 500 Internal Server Error");
        echo json_encode([
            "error" => "Failed to connect to Node.js server",
            "details" => $error
        ]);
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
    header("HTTP/1.1 404 Not Found");
    echo json_encode(["error" => "Invalid API endpoint"]);
}