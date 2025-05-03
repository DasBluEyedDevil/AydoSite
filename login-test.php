<?php
// Login Test Script

// Get form data (if form was submitted)
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';
$result = null;

// Process login attempt
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($username) && !empty($password)) {
    // API endpoint for login
    $apiUrl = 'http://localhost:8080/api/auth/login';
    
    // Prepare request data
    $data = json_encode([
        'username' => $username,
        'password' => $password
    ]);
    
    // Initialize cURL
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($data)
    ]);
    
    // Execute request
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    // Prepare result
    $result = [
        'status' => $status,
        'response' => $response ? json_decode($response, true) : null,
        'error' => $error
    ];
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Login Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; }
        input[type="text"], input[type="password"] { width: 100%; padding: 8px; }
        button { padding: 10px 15px; background: #4CAF50; color: white; border: none; cursor: pointer; }
        .result { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        pre { white-space: pre-wrap; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Login Test</h1>
    <p>This form tests the connection to the Node.js backend server for login authentication.</p>
    
    <form method="post" action="">
        <div class="form-group">
            <label for="username">Username:</label>
            <input type="text" id="username" name="username" required value="<?php echo htmlspecialchars($username); ?>">
        </div>
        
        <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required>
        </div>
        
        <button type="submit">Test Login</button>
    </form>
    
    <?php if ($result): ?>
    <div class="result">
        <h2>Test Results</h2>
        <p><strong>Status Code:</strong> <?php echo $result['status']; ?></p>
        
        <?php if ($result['error']): ?>
        <p><strong>Error:</strong> <?php echo $result['error']; ?></p>
        <?php endif; ?>
        
        <?php if ($result['response']): ?>
        <p><strong>Response:</strong></p>
        <pre><?php echo json_encode($result['response'], JSON_PRETTY_PRINT); ?></pre>
        <?php endif; ?>
    </div>
    <?php endif; ?>
</body>
</html>