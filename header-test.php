<?php
// Set headers to prevent caching
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Content-Type: text/html; charset=UTF-8");

// Function to get headers for a URL
function getHeaders($url) {
    $headers = array();
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    $response = curl_exec($ch);
    
    if ($response === false) {
        return array('error' => curl_error($ch));
    }
    
    $headerLines = explode("\n", $response);
    foreach ($headerLines as $line) {
        $line = trim($line);
        if (strpos($line, ':') !== false) {
            list($key, $value) = explode(':', $line, 2);
            $headers[trim($key)] = trim($value);
        } elseif (!empty($line)) {
            if (strpos($line, 'HTTP') === 0) {
                $headers['Status'] = $line;
            }
        }
    }
    
    curl_close($ch);
    return $headers;
}

// Get the current host
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = $protocol . '://' . $_SERVER['HTTP_HOST'];

// Files to check
$files = array(
    'HTML File' => 'mime-test.html',
    'HTML Index' => 'index.html',
    'CSS File' => 'assets/css/main.css',
    'JavaScript File' => 'assets/js/main.js',
    'PHP File' => 'mime-check.php',
    'JSON File (if exists)' => 'package.json'
);

// Get the headers for each file
$results = array();
foreach ($files as $name => $file) {
    $url = $host . '/' . $file;
    $results[$name] = array(
        'url' => $url,
        'headers' => getHeaders($url)
    );
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTTP Header Tester</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .section { margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .success { background-color: #d4edda; }
        .warning { background-color: #fff3cd; }
        .error { background-color: #f8d7da; }
        .code { font-family: monospace; background-color: #f8f9fa; padding: 2px 4px; }
    </style>
</head>
<body>
    <h1>HTTP Header Test Results</h1>
    <p>This page tests the HTTP headers returned by your server for different file types.</p>
    
    <div class="section">
        <h2>Server Information</h2>
        <ul>
            <li><strong>Server Software:</strong> <?php echo $_SERVER['SERVER_SOFTWARE']; ?></li>
            <li><strong>Host:</strong> <?php echo $_SERVER['HTTP_HOST']; ?></li>
            <li><strong>Protocol:</strong> <?php echo $protocol; ?></li>
            <li><strong>PHP Version:</strong> <?php echo phpversion(); ?></li>
        </ul>
    </div>
    
    <div class="section">
        <h2>HTTP Headers by File Type</h2>
        <?php foreach ($results as $name => $result): ?>
            <h3><?php echo htmlspecialchars($name); ?></h3>
            <p><strong>URL:</strong> <span class="code"><?php echo htmlspecialchars($result['url']); ?></span></p>
            
            <?php if (isset($result['headers']['error'])): ?>
                <p class="error">Error: <?php echo htmlspecialchars($result['headers']['error']); ?></p>
            <?php else: ?>
                <table>
                    <tr>
                        <th>Header</th>
                        <th>Value</th>
                    </tr>
                    <?php foreach ($result['headers'] as $header => $value): ?>
                        <tr class="<?php echo $header === 'Content-Type' ? 'success' : ''; ?>">
                            <td><?php echo htmlspecialchars($header); ?></td>
                            <td><?php echo htmlspecialchars($value); ?></td>
                        </tr>
                    <?php endforeach; ?>
                </table>
            <?php endif; ?>
        <?php endforeach; ?>
    </div>
    
    <div class="section">
        <h2>Troubleshooting Recommendations</h2>
        <ol>
            <li>
                <strong>If files show incorrect Content-Type:</strong>
                <ul>
                    <li>Ensure your .htaccess file is being processed by the server</li>
                    <li>Check if <span class="code">mod_mime</span> and <span class="code">mod_headers</span> are enabled</li>
                    <li>Try using <span class="code">AddType</span> instead of <span class="code">ForceType</span></li>
                </ul>
            </li>
            <li>
                <strong>If HTML still shows as raw code:</strong>
                <ul>
                    <li>Try the alternative .htaccess file: <span class="code">.htaccess.alternative</span></li>
                    <li>Contact your hosting provider to check server configuration</li>
                    <li>Try adding <span class="code">DirectoryIndex index.html index.php</span> to your .htaccess</li>
                </ul>
            </li>
        </ol>
    </div>
</body>
</html> 