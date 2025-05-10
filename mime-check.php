<?php
// MIME Type Check Utility
header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MIME Type Diagnosis</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .section { margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background-color: #d4edda; }
        .warning { background-color: #fff3cd; }
        .failure { background-color: #f8d7da; }
        pre { background: #f8f9fa; padding: 10px; overflow-x: auto; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>MIME Type and Server Configuration Diagnosis</h1>
    
    <div class="section">
        <h2>Server Information</h2>
        <ul>
            <li>PHP Version: <?php echo phpversion(); ?></li>
            <li>Web Server: <?php echo $_SERVER['SERVER_SOFTWARE']; ?></li>
            <li>Server Name: <?php echo $_SERVER['SERVER_NAME']; ?></li>
            <li>Document Root: <?php echo $_SERVER['DOCUMENT_ROOT']; ?></li>
            <li>Current Script: <?php echo $_SERVER['SCRIPT_NAME']; ?></li>
        </ul>
    </div>
    
    <div class="section">
        <h2>MIME Type Configuration Check</h2>
        <?php
        $file_types = [
            'HTML' => ['ext' => 'html', 'expected_mime' => 'text/html'],
            'CSS' => ['ext' => 'css', 'expected_mime' => 'text/css'],
            'JavaScript' => ['ext' => 'js', 'expected_mime' => 'application/javascript'],
            'JSON' => ['ext' => 'json', 'expected_mime' => 'application/json'],
            'PNG' => ['ext' => 'png', 'expected_mime' => 'image/png'],
            'JPEG' => ['ext' => 'jpg', 'expected_mime' => 'image/jpeg'],
        ];
        
        echo '<table>';
        echo '<tr><th>File Type</th><th>Extension</th><th>Expected MIME</th><th>Apache Config</th><th>Status</th></tr>';
        
        foreach ($file_types as $type => $info) {
            echo '<tr>';
            echo "<td>$type</td>";
            echo "<td>{$info['ext']}</td>";
            echo "<td>{$info['expected_mime']}</td>";
            
            // Check if ForceType or AddType directives are present in .htaccess
            $htaccess_content = file_exists('.htaccess') ? file_get_contents('.htaccess') : '';
            $has_directive = false;
            
            if (strpos($htaccess_content, "ForceType {$info['expected_mime']}") !== false ||
                strpos($htaccess_content, "AddType {$info['expected_mime']} .{$info['ext']}") !== false ||
                strpos($htaccess_content, "<FilesMatch \"\\.{$info['ext']}") !== false) {
                $has_directive = true;
            }
            
            echo '<td>' . ($has_directive ? 'Configured' : 'Not Found') . '</td>';
            echo '<td class="' . ($has_directive ? 'success' : 'warning') . '">' . 
                 ($has_directive ? 'OK' : 'Check Needed') . '</td>';
            echo '</tr>';
        }
        
        echo '</table>';
        ?>
    </div>
    
    <div class="section">
        <h2>HTTP Headers Sent By Server</h2>
        <p>Test the headers sent when requesting different file types:</p>
        <ul>
            <li><a href="mime-test.html" target="_blank">Test HTML file</a></li>
            <li><a href="assets/css/main.css" target="_blank">Test CSS file</a></li>
            <li><a href="assets/js/main.js" target="_blank">Test JavaScript file</a></li>
        </ul>
        
        <p>You can use browser developer tools (F12) to inspect the Network tab and view the Content-Type headers.</p>
    </div>
    
    <div class="section">
        <h2>Recommended Fixes</h2>
        <p>If your .htaccess changes don't take effect, try these alternatives:</p>
        <pre>
# Option 1: Use AddType instead of ForceType
AddType text/html .html .htm
AddType text/css .css
AddType application/javascript .js

# Option 2: Try a different syntax for FilesMatch
&lt;Files *.html&gt;
    Header set Content-Type "text/html; charset=UTF-8"
&lt;/Files&gt;

# Option 3: Check if mod_mime is enabled
# Add to your .htaccess:
&lt;IfModule mod_mime.c&gt;
    AddType text/html .html .htm
    AddType text/css .css
    AddType application/javascript .js
&lt;/IfModule&gt;
        </pre>
        
        <p>If you're still having issues, you might need to contact your hosting provider to ensure:</p>
        <ol>
            <li>mod_headers is enabled</li>
            <li>mod_mime is enabled</li>
            <li>AllowOverride is set to All for your directory</li>
        </ol>
    </div>
</body>
</html> 