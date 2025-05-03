<?php
// Detailed API Debug Script

// Set appropriate headers for the response
header('Content-Type: text/html');
?>
<!DOCTYPE html>
<html>
<head>
    <title>API Connection Diagnostic</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .result { margin: 20px 0; padding: 10px; border: 1px solid #ddd; }
        .success { background-color: #d4edda; }
        .error { background-color: #f8d7da; }
        pre { white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>API Connection Diagnostic</h1>
    <div id="info">
        <h2>Environment Information</h2>
        <ul>
            <li>Server: <?php echo $_SERVER['SERVER_SOFTWARE']; ?></li>
            <li>PHP Version: <?php echo phpversion(); ?></li>
            <li>Current URL: <?php echo $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']; ?></li>
            <li>Client IP: <?php echo $_SERVER['REMOTE_ADDR']; ?></li>
            <li>Server Name: <?php echo $_SERVER['SERVER_NAME']; ?></li>
        </ul>
    </div>

    <div id="node-test">
        <h2>1. Testing Node.js Server Connection</h2>
        <?php
        // Function to test a connection and display results
        function testConnection($url, $method = 'GET', $headers = [], $data = null) {
            echo "<p>Testing: <strong>$method $url</strong></p>";
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
            
            if ($headers) {
                curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            }
            
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            }
            
            $response = curl_exec($ch);
            $error = curl_error($ch);
            $http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $total_time = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
            
            echo "<div class='result " . ($error ? 'error' : ($http_status < 400 ? 'success' : 'error')) . "'>";
            echo "<h3>Results:</h3>";
            echo "<ul>";
            echo "<li>Status Code: $http_status</li>";
            echo "<li>Response Time: " . round($total_time * 1000) . "ms</li>";
            
            if ($error) {
                echo "<li>Error: $error</li>";
            } else {
                echo "<li>Response Body:</li>";
                echo "<pre>" . htmlspecialchars($response) . "</pre>";
            }
            
            echo "</ul></div>";
            curl_close($ch);
            return !$error && $http_status < 400;
        }
        
        // Test direct connection to Node.js server
        $node_url = "http://localhost:8080/api/test";
        $direct_success = testConnection($node_url);
        
        if (!$direct_success) {
            echo "<div class='result error'>";
            echo "<h3>Testing Node.js on another port:</h3>";
            testConnection("http://localhost:3000/api/test");
            echo "</div>";
        }
        ?>
    </div>

    <div id="proxy-test">
        <h2>2. Testing PHP Proxy</h2>
        <?php
        // Test our PHP Proxy
        echo "<p>Testing if PHP can proxy requests to the Node.js server</p>";
        echo "<div class='result'>";
        echo "<h3>Creating Test Request:</h3>";
        
        $api_url = "http://localhost:8080/api/test";
        
        echo "<pre>
        PHP Proxy Test for URL: $api_url
        </pre>";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        $response = curl_exec($ch);
        $error = curl_error($ch);
        $http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if ($error) {
            echo "<div class='error'>";
            echo "<p>Error connecting to Node.js server: $error</p>";
            echo "</div>";
        } else {
            echo "<div class='" . ($http_status < 400 ? 'success' : 'error') . "'>";
            echo "<p>Status Code: $http_status</p>";
            echo "<p>Response:</p>";
            echo "<pre>" . htmlspecialchars($response) . "</pre>";
            echo "</div>";
        }
        
        curl_close($ch);
        echo "</div>";
        ?>
    </div>

    <div id="config-test">
        <h2>3. Testing Server Configuration</h2>
        <?php
        // Check if mod_proxy is enabled
        $modules = apache_get_modules();
        $mod_proxy_enabled = in_array('mod_proxy', $modules);
        $mod_proxy_http_enabled = in_array('mod_proxy_http', $modules);
        
        echo "<div class='result " . ($mod_proxy_enabled && $mod_proxy_http_enabled ? 'success' : 'error') . "'>";
        echo "<h3>Apache Modules:</h3>";
        echo "<ul>";
        echo "<li>mod_proxy: " . ($mod_proxy_enabled ? 'Enabled' : 'Not enabled') . "</li>";
        echo "<li>mod_proxy_http: " . ($mod_proxy_http_enabled ? 'Enabled' : 'Not enabled') . "</li>";
        echo "</ul>";
        
        if (!$mod_proxy_enabled || !$mod_proxy_http_enabled) {
            echo "<p><strong>Note:</strong> The Apache proxy modules are required for the .htaccess proxy to work. If they are not enabled, you'll need to use the PHP proxy approach.</p>";
        }
        echo "</div>";
        
        // Check if our PHP proxy file exists
        $api_php_exists = file_exists('api.php');
        echo "<div class='result " . ($api_php_exists ? 'success' : 'error') . "'>";
        echo "<h3>PHP Proxy:</h3>";
        echo "<ul>";
        echo "<li>api.php exists: " . ($api_php_exists ? 'Yes' : 'No') . "</li>";
        echo "</ul>";
        
        if (!$api_php_exists) {
            echo "<p><strong>Recommendation:</strong> Create the PHP proxy file as suggested in previous steps.</p>";
        }
        echo "</div>";
        ?>
    </div>

    <div id="recommended-solution">
        <h2>4. Recommended Solution</h2>
        <?php
        // Check if both mod_proxy modules are enabled
        if ($mod_proxy_enabled && $mod_proxy_http_enabled) {
            echo "<div class='result success'>";
            echo "<h3>Use Apache Proxy (Recommended)</h3>";
            echo "<p>Since mod_proxy and mod_proxy_http are available, the recommended approach is to use Apache's proxy capabilities via .htaccess.</p>";
            echo "<p>Ensure your .htaccess contains these directives:</p>";
            echo "<pre>
# Enable rewrite engine
RewriteEngine On

# Only proxy API requests
RewriteCond %{REQUEST_URI} ^/api/ [NC]
RewriteRule ^api/(.*)$ http://localhost:8080/api/$1 [P,L]

# Add ProxyPassReverse directive
ProxyPassReverse /api/ http://localhost:8080/api/
</pre>";
            echo "</div>";
        } else {
            echo "<div class='result success'>";
            echo "<h3>Use PHP Proxy (Recommended)</h3>";
            echo "<p>Since the required Apache modules are not available, the recommended approach is to use the PHP proxy.</p>";
            echo "<p>Make sure you have api.php in your web root with the following code:</p>";
            echo "<pre>" . htmlspecialchars('<?php
// Simple PHP API Proxy

// Set appropriate headers for CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-auth-token");

// Get current path info
$request_uri = $_SERVER["REQUEST_URI"];
$path = parse_url($request_uri, PHP_URL_PATH);

// Only process requests that start with /api/
if (strpos($path, "/api/") === 0) {
    // Extract the part after /api/
    $api_path = substr($path, 5); // Remove "/api/"
    
    // Forward to Node.js server
    $node_url = "http://localhost:8080/api/" . $api_path;
    
    // Get request method and headers
    $method = $_SERVER["REQUEST_METHOD"];
    $headers = getallheaders();
    
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
?>') . "</pre>";
            echo "<p>Then modify your .htaccess file to redirect API requests to this PHP file:</p>";
            echo "<pre>
# Redirect API requests to our PHP proxy
RewriteEngine On
RewriteRule ^api/(.*)$ api.php [L]
</pre>";
            echo "</div>";
        }
        ?>
    </div>

    <div id="client-js">
        <h2>5. JavaScript Client Setup</h2>
        <div class='result'>
            <h3>Client-side API Connection</h3>
            <p>Make sure your JavaScript code uses the correct API URL format. Here's the proper connection code:</p>
            <pre>
function getApiBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8080';
    } else {
        // Use the current domain - this is important!
        return window.location.origin;
    }
}

async function testApiConnection() {
    try {
        const apiBase = getApiBaseUrl();
        const url = `${apiBase}/api/test`;
        console.log('Testing API connection to:', url);
        
        const response = await fetch(url);
        const status = response.status;
        console.log('API test response status:', status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('API test response data:', data);
            return true;
        } else {
            console.error('API test failed with status:', status);
            return false;
        }
    } catch (error) {
        console.error('API connection test failed with error:', error);
        return false;
    }
}
</pre>
        </div>
    </div>
</body>
</html>