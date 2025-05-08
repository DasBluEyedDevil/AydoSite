<?php
// update-content.php - Updates the content in index.html file
header('Content-Type: application/json');

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Log function for debugging
function debug_log($message) {
    error_log("[Content Update] " . $message);
}

// Get the request data
$request_data = json_decode(file_get_contents('php://input'), true);

// Check if we have the required data
if (!isset($request_data['pageElement']) || !isset($request_data['title']) || !isset($request_data['content'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required data']);
    exit;
}

$pageElement = $request_data['pageElement'];
$title = $request_data['title'];
$content = $request_data['content'];

debug_log("Updating content for: " . $pageElement);

// Path to the index.html file
$file_path = __DIR__ . '/index.html';

// Check if the file exists and is writable
if (!file_exists($file_path)) {
    debug_log("Error: index.html file not found");
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'index.html file not found']);
    exit;
}

if (!is_writable($file_path)) {
    debug_log("Error: index.html file is not writable");
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'index.html file is not writable']);
    exit;
}

// Read the file content
$html_content = file_get_contents($file_path);
if ($html_content === false) {
    debug_log("Error: Could not read index.html file");
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not read index.html file']);
    exit;
}

// Define patterns to find the content sections based on the page element
$patterns = [
    'about' => [
        'title' => '/<article id="about">\s*<h2 class="major">(.*?)<\/h2>/s',
        'content' => '/<p>Based in the Ellis system(.*?)<\/p>\s*<\/article>/s'
    ],
    'services' => [
        'title' => '/<article id="services">\s*<h2 class="major">(.*?)<\/h2>/s',
        'content' => '/<p>If you are an organization(.*?)<\/div>\s*<\/article>/s'
    ],
    'subsidiaries' => [
        'title' => '/<article id="subsidiaries">\s*<h2 class="major">(.*?)<\/h2>/s',
        'content' => '/<div class="subsidiaries-grid">(.*?)<\/article>/s'
    ],
    'contact' => [
        'title' => '/<article id="contact">\s*<h2 class="major">(.*?)<\/h2>/s',
        'content' => '/<form method="post"(.*?)<\/article>/s'
    ]
];

// Check if we have patterns for the requested page element
if (!isset($patterns[$pageElement])) {
    debug_log("Error: Unknown page element: " . $pageElement);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unknown page element']);
    exit;
}

// Update the title
$title_pattern = $patterns[$pageElement]['title'];
$new_title_html = '<article id="' . $pageElement . '">' . "\n" . '    <h2 class="major">' . $title . '</h2>';
$html_content = preg_replace($title_pattern, $new_title_html, $html_content, 1, $title_count);

if ($title_count !== 1) {
    debug_log("Error: Could not update title for " . $pageElement . ". Matches found: " . $title_count);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not update title']);
    exit;
}

// Process the content based on the page element
// For simplicity, we're just replacing the entire content section
// In a real implementation, you might want to be more selective
$content_parts = explode("\n\n", $content);
$content_body = isset($content_parts[1]) ? $content_parts[1] : $content;

// Create the new content HTML based on the page element
$new_content_html = '';
switch ($pageElement) {
    case 'about':
        $new_content_html = '<p>' . $content_body . '</p>' . "\n" . '</article>';
        break;
    case 'services':
        $new_content_html = '<p>' . $content_body . '</p>' . "\n" . '</article>';
        break;
    case 'subsidiaries':
        $new_content_html = '<div class="subsidiaries-grid">' . $content_body . '</div>' . "\n" . '</article>';
        break;
    case 'contact':
        // For contact, we'll preserve the form and just update the text after it
        $new_content_html = '<form method="post" action="#">' . $content_body . '</form>' . "\n" . '</article>';
        break;
    default:
        debug_log("Error: Unsupported page element for content update: " . $pageElement);
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Unsupported page element for content update']);
        exit;
}

// Update the content
$content_pattern = $patterns[$pageElement]['content'];
$html_content = preg_replace($content_pattern, $new_content_html, $html_content, 1, $content_count);

if ($content_count !== 1) {
    debug_log("Error: Could not update content for " . $pageElement . ". Matches found: " . $content_count);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not update content']);
    exit;
}

// Write the updated content back to the file
if (file_put_contents($file_path, $html_content) === false) {
    debug_log("Error: Could not write to index.html file");
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not write to index.html file']);
    exit;
}

debug_log("Successfully updated content for: " . $pageElement);

// Return success response
echo json_encode([
    'success' => true, 
    'message' => 'Content updated successfully',
    'pageElement' => $pageElement,
    'title' => $title
]);
?>