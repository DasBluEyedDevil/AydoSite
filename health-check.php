<?php
// Simple health check for the API proxy
$result = [
    'status' => 'checking',
    'proxy' => false,
    'api' => false
];

// Try to connect to the Node.js API server
$ch = curl_init('http://localhost:3001/api/test');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$response = curl_exec($ch);
$error = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if (!$error && $httpCode === 200) {
    $result['api'] = true;
}

// Set status based on results
if ($result['proxy'] && $result['api']) {
    $result['status'] = 'ok';
} else if ($result['proxy']) {
    $result['status'] = 'proxy_ok_api_fail';
} else {
    $result['status'] = 'proxy_fail';
}

// Return JSON response
header('Content-Type: application/json');
echo json_encode($result);