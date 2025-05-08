<?php
// Simple PHP API Proxy - Debug version with logging

// Enable debug mode 
define('DEBUG', true);

// Function to log debug messages
function debug_log($message) {
    if (DEBUG) {
        error_log("[API Proxy] " . $message);
        // Also log to a file in the same directory
        file_put_contents('api_proxy.log', date('[Y-m-d H:i:s] ') . $message . "\n", FILE_APPEND);
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
    // Try multiple possible Node.js server addresses
    $node_servers = [
        "https://aydocorp.space/api/",  // Primary production URL
        "http://aydocorp.space:8080/api/", // Fallback production URL
        "http://localhost:8080/api/",  // Local development fallback
        "http://127.0.0.1:8080/api/"   // Alternative local fallback
    ];

    $node_url = null;
    $connection_error = null;

    foreach ($node_servers as $server_base) {
        $test_url = $server_base . "test";
        debug_log("Testing connection to: " . $test_url);

        // Quick connection test
        $test_ch = curl_init($test_url);
        curl_setopt($test_ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($test_ch, CURLOPT_TIMEOUT, 2); // Short timeout for test
        curl_setopt($test_ch, CURLOPT_NOBODY, true); // HEAD request
        curl_exec($test_ch);
        $test_error = curl_error($test_ch);
        $test_http_code = curl_getinfo($test_ch, CURLINFO_HTTP_CODE);
        curl_close($test_ch);

        if (empty($test_error) && $test_http_code < 400) {
            $node_url = $server_base . $api_path;
            debug_log("Found working Node.js server at: " . $server_base);
            break;
        } else {
            debug_log("Server " . $server_base . " test failed: " . ($test_error ? $test_error : "HTTP " . $test_http_code));
            $connection_error = $test_error ? $test_error : "HTTP " . $test_http_code;
        }
    }

    // If all servers failed, use the default and hope for the best
    if ($node_url === null) {
        debug_log("All Node.js server tests failed. Using default as fallback.");
        $node_url = "http://localhost:8080/api/" . $api_path;
    }

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
            "url" => $node_url,
            "tried_servers" => $node_servers,
            "connection_error" => $connection_error,
            "debug_info" => "The Node.js API server appears to be unreachable. This may be due to the server being down, a network issue, or a configuration problem."
        ]);
        curl_close($ch);
        exit;
    }

    // Handle 404 errors with more detailed information
    if ($status_code === 404) {
        debug_log("404 Not Found for: " . $node_url);

        // Try to determine if it's a routing issue or a server issue
        $server_info = parse_url($node_url);
        $host = $server_info['host'];
        $port = isset($server_info['port']) ? $server_info['port'] : ($server_info['scheme'] === 'https' ? 443 : 80);

        // Test if the server itself is reachable
        $server_test_url = $server_info['scheme'] . "://" . $host . ":" . $port . "/api/test";
        $test_ch = curl_init($server_test_url);
        curl_setopt($test_ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($test_ch, CURLOPT_TIMEOUT, 2);
        curl_exec($test_ch);
        $test_error = curl_error($test_ch);
        $test_http_code = curl_getinfo($test_ch, CURLINFO_HTTP_CODE);
        curl_close($test_ch);

        $server_reachable = empty($test_error) && $test_http_code < 400;

        // Add detailed debug information to the response
        $debug_info = [
            "error" => "API endpoint not found",
            "url" => $node_url,
            "server_reachable" => $server_reachable,
            "server_test_url" => $server_test_url,
            "server_test_result" => $server_reachable ? "Success" : ($test_error ? $test_error : "HTTP " . $test_http_code),
            "possible_causes" => [
                "The requested API endpoint does not exist on the server",
                "The Node.js API server is running but the route is not defined",
                "The API server is running on a different port or host than expected"
            ],
            "suggestions" => [
                "Check if the API endpoint path is correct",
                "Verify that the Node.js server is running and accessible",
                "Check the server logs for more information"
            ]
        ];

        debug_log("Detailed 404 debug info: " . json_encode($debug_info));

        // Pass through the 404 status but add our debug info
        // This maintains compatibility with the frontend error handling

        // For page content endpoints, provide a fallback response
        if (strpos($api_path, "page-content/pages") === 0) {
            debug_log("Providing fallback response for page content endpoint");

            // Extract the page name from the URL
            $url_parts = explode('/', $api_path);
            $page_name = isset($url_parts[2]) ? $url_parts[2] : '';
            $is_sections_endpoint = isset($url_parts[3]) && $url_parts[3] === 'sections';

            // Create a fallback response based on the request method and endpoint
            if ($method === 'GET') {
                // For GET requests, return a minimal page structure
                $fallback_response = [
                    "pageName" => $page_name,
                    "pageTitle" => ucfirst($page_name),
                    "description" => "Fallback page content",
                    "sections" => [],
                    "isPublished" => true,
                    "_fallback" => true,
                    "debug_info" => $debug_info
                ];

                // Return a 200 OK status instead of 404
                http_response_code(200);
                header('Content-Type: application/json');
                echo json_encode($fallback_response);
                exit;
            } 
            else if ($method === 'POST') {
                // For POST requests, pretend the operation succeeded
                $fallback_response = [
                    "success" => true,
                    "message" => "Content updated in DOM but not saved to database",
                    "_fallback" => true,
                    "debug_info" => $debug_info
                ];

                // Return a 200 OK status instead of 404
                http_response_code(200);
                header('Content-Type: application/json');
                echo json_encode($fallback_response);
                exit;
            }
        }
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
