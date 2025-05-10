<?php
// Simple PHP API Proxy

// Set appropriate headers for CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-auth-token");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get current path info
$request_uri = $_SERVER["REQUEST_URI"];
$path = parse_url($request_uri, PHP_URL_PATH);

// Only process requests that start with /api/
if (strpos($path, "/api/") === 0) {
    // Extract the part after /api/
    $api_path = substr($path, 5); // Remove "/api/"

    // Forward to Node.js server
    $node_url = "http://localhost:3000/api/" . $api_path;

    // Get request method and headers
    $method = $_SERVER["REQUEST_METHOD"];
    $headers = getallheaders();

    // Set up cURL options with timeouts
    $options = [
        CURLOPT_URL => $node_url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_CONNECTTIMEOUT => 5,  // Connection timeout in seconds
        CURLOPT_TIMEOUT => 30,        // Request timeout in seconds
        CURLOPT_DNS_CACHE_TIMEOUT => 120, // Cache DNS for 2 minutes
        CURLOPT_TCP_KEEPALIVE => 1,   // Enable TCP keepalive
    ];

    // Add headers
    $curl_headers = [];
    foreach ($headers as $key => $value) {
        if (!in_array(strtolower($key), ["host", "connection", "content-length"])) {
            $curl_headers[] = "$key: $value";
        }
    }

    // Add request body for POST/PUT/PATCH
    if ($method === "POST" || $method === "PUT" || $method === "PATCH") {
        $input = file_get_contents("php://input");
        $options[CURLOPT_POSTFIELDS] = $input;
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

    // Check for errors
    if ($error = curl_error($ch)) {
        // Log the error for server-side debugging
        error_log("API Proxy Error: " . $error . " - URL: " . $node_url);

        // Get more detailed error information
        $errno = curl_errno($ch);
        $info = curl_getinfo($ch);

        // Prepare a user-friendly error message
        $errorMessage = "Failed to connect to API server";
        $errorDetails = $error;

        // Provide more specific messages for common errors
        switch ($errno) {
            case CURLE_OPERATION_TIMEDOUT:
                $errorMessage = "Connection to API server timed out";
                $errorDetails = "The request took too long to complete. Please try again later.";
                break;
            case CURLE_COULDNT_CONNECT:
                $errorMessage = "Could not connect to API server";
                $errorDetails = "The API server may be down or unreachable. Please try again later.";
                break;
            case CURLE_COULDNT_RESOLVE_HOST:
                $errorMessage = "Could not resolve API server hostname";
                $errorDetails = "DNS resolution failed. Please check your network connection.";
                break;
        }

        header("HTTP/1.1 503 Service Unavailable");
        header("Retry-After: 30");  // Suggest client retry after 30 seconds
        echo json_encode([
            "error" => $errorMessage,
            "message" => $errorDetails,
            "code" => $errno,
            "request_url" => $node_url,
            "request_method" => $method,
            "timestamp" => date("c")
        ]);
        exit;
    }

    // Close cURL
    curl_close($ch);

    // Set proper content type based on response
    if (!empty($content_type)) {
        header("Content-Type: $content_type");
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
?>
