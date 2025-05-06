<?php
// API Diagnostic Tool
header('Content-Type: text/html');
?>
<!DOCTYPE html>
<html>
<head>
    <title>API Diagnostic Tool</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background-color: #d4edda; }
        .failure { background-color: #f8d7da; }
        h2 { margin-top: 0; }
        pre { background: #f8f9fa; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>API Diagnostic Tool</h1>
    
    <div class="section">
        <h2>Server Information</h2>
        <ul>
            <li>PHP Version: <?php echo phpversion(); ?></li>
            <li>Web Server: <?php echo $_SERVER['SERVER_SOFTWARE']; ?></li>
            <li>Current Host: <?php echo $_SERVER['HTTP_HOST']; ?></li>
            <li>cURL Installed: <?php echo function_exists('curl_init') ? 'Yes' : 'No'; ?></li>
            <li>Allow URL fopen: <?php echo ini_get('allow_url_fopen') ? 'Yes' : 'No'; ?></li>
        </ul>
    </div>
    
    <div class="section">
        <h2>Testing PHP to Node.js Connection</h2>
        <?php
        $node_urls = [
            'Default' => 'http://localhost:8080/api/test',
            'Alternate Port' => 'http://localhost:3000/api/test',
            'IP Address' => 'http://127.0.0.1:8080/api/test'
        ];
        
        foreach ($node_urls as $label => $url) {
            echo "<h3>$label: $url</h3>";
            
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            $response = curl_exec($ch);
            $error = curl_error($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            echo '<div class="' . ($error || $http_code >= 400 ? 'failure' : 'success') . '">';
            echo "<p><strong>Status Code:</strong> $http_code</p>";
            
            if ($error) {
                echo "<p><strong>Error:</strong> $error</p>";
            } else {
                echo "<p><strong>Response:</strong></p>";
                echo "<pre>" . htmlspecialchars($response) . "</pre>";
            }
            echo "</div>";
        }
        ?>
    </div>
    
    <div class="section">
        <h2>Testing API Proxy Configuration</h2>
        <?php
        // Test if .htaccess is working by checking if a request to /api/test is properly proxied
        $proxy_url = 'http' . (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 's' : '') . 
                     '://' . $_SERVER['HTTP_HOST'] . '/api/test';
        
        echo "<p>Testing proxy URL: $proxy_url</p>";
        
        $ch = curl_init($proxy_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $response = curl_exec($ch);
        $error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        echo '<div class="' . ($error || $http_code >= 400 ? 'failure' : 'success') . '">';
        echo "<p><strong>Status Code:</strong> $http_code</p>";
        
        if ($error) {
            echo "<p><strong>Error:</strong> $error</p>";
        } else {
            echo "<p><strong>Response:</strong></p>";
            echo "<pre>" . htmlspecialchars($response) . "</pre>";
        }
        echo "</div>";
        ?>
    </div>
    
    <div class="section">
        <h2>Checking File Accessibility</h2>
        <?php
        $files_to_check = [
            '.htaccess' => file_exists('.htaccess'),
            'api.php' => file_exists('api.php')
        ];
        
        foreach ($files_to_check as $file => $exists) {
            echo "<p><strong>$file:</strong> " . ($exists ? 'Exists' : 'Missing') . "</p>";
        }
        ?>
    </div>
</body>
</html>