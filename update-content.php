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

// Load the HTML content into a DOMDocument for easier manipulation
$dom = new DOMDocument();
// Disable error reporting for HTML5 tags
libxml_use_internal_errors(true);
$dom->loadHTML($html_content, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
libxml_clear_errors();

// Find the article element for the specified page element
$xpath = new DOMXPath($dom);
$article = $xpath->query("//article[@id='$pageElement']")->item(0);

if (!$article) {
    debug_log("Error: Could not find article with id: $pageElement");
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Could not find article with id: $pageElement"]);
    exit;
}

// Update the title
$title_element = $xpath->query(".//h2[@class='major']", $article)->item(0);
if ($title_element) {
    $title_element->nodeValue = $title;
} else {
    debug_log("Error: Could not find title element for: $pageElement");
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Could not find title element"]);
    exit;
}

// Parse the HTML content
$htmlContent = $content;

// Process the content based on the page element
switch ($pageElement) {
    case 'about':
        updateAboutContent($dom, $article, $htmlContent);
        break;
    case 'services':
        updateServicesContent($dom, $article, $htmlContent);
        break;
    case 'subsidiaries':
        updateSubsidiariesContent($dom, $article, $htmlContent);
        break;
    case 'contact':
        updateContactContent($dom, $article, $htmlContent);
        break;
    default:
        debug_log("Error: Unsupported page element for content update: " . $pageElement);
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Unsupported page element for content update']);
        exit;
}

// Save the updated HTML
$html_content = $dom->saveHTML();

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

// Helper function to parse HTML content into sections
function parseHtmlContent($content) {
    // Create a DOMDocument to parse the HTML content
    $dom = new DOMDocument();
    libxml_use_internal_errors(true); // Suppress warnings for HTML5 tags
    $dom->loadHTML('<div>' . $content . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();

    // Get the root div element
    $xpath = new DOMXPath($dom);
    $rootDiv = $xpath->query('//div')->item(0);

    // Return the parsed content as a DOMNodeList
    return $rootDiv->childNodes;
}

// Helper function to update the About content
function updateAboutContent($dom, $article, $htmlContent) {
    // Keep the title and image
    $title = null;
    $image = null;

    // Find the title and image elements
    $xpath = new DOMXPath($dom);
    $title = $xpath->query(".//h2[@class='major']", $article)->item(0);
    $image = $xpath->query(".//span[@class='image main']", $article)->item(0);

    // Remove all child nodes except title
    while ($article->firstChild) {
        $article->removeChild($article->firstChild);
    }

    // Add back the title and image
    if ($title) {
        $article->appendChild($title);
    }
    if ($image) {
        $article->appendChild($image);
    }

    // Parse the HTML content
    $contentDom = new DOMDocument();
    libxml_use_internal_errors(true);
    $contentDom->loadHTML('<div>' . $htmlContent . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();

    // Get all elements from the content
    $contentXpath = new DOMXPath($contentDom);
    $elements = $contentXpath->query('//div/*');

    // Add each element to the article
    foreach ($elements as $element) {
        // Skip image elements if we already have one
        if ($image && $element->nodeName === 'span' && strpos($element->getAttribute('class'), 'image main') !== false) {
            continue;
        }

        // Import the node into the target document
        $importedNode = $dom->importNode($element, true);
        $article->appendChild($importedNode);
    }
}

// Helper function to update the Services content
function updateServicesContent($dom, $article, $htmlContent) {
    // Keep the title and image
    $title = null;
    $image = null;

    // Find the title and image elements
    $xpath = new DOMXPath($dom);
    $title = $xpath->query(".//h2[@class='major']", $article)->item(0);
    $image = $xpath->query(".//span[@class='image main']", $article)->item(0);

    // Remove all child nodes
    while ($article->firstChild) {
        $article->removeChild($article->firstChild);
    }

    // Add back the title and image
    if ($title) {
        $article->appendChild($title);
    }
    if ($image) {
        $article->appendChild($image);
    }

    // Parse the HTML content
    $contentDom = new DOMDocument();
    libxml_use_internal_errors(true);
    $contentDom->loadHTML('<div>' . $htmlContent . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();

    // Get all elements from the content
    $contentXpath = new DOMXPath($contentDom);
    $elements = $contentXpath->query('//div/*');

    // Add each element to the article
    foreach ($elements as $element) {
        // Skip image elements if we already have one
        if ($image && $element->nodeName === 'span' && strpos($element->getAttribute('class'), 'image main') !== false) {
            continue;
        }

        // Import the node into the target document
        $importedNode = $dom->importNode($element, true);
        $article->appendChild($importedNode);
    }

    // Add the hire-us button
    $button_container = $dom->createElement('div');
    $button_container->setAttribute('class', 'hire-us-button-container');

    $button = $dom->createElement('a', 'Hire Us!');
    $button->setAttribute('href', 'https://docs.google.com/forms/d/e/1FAIpQLSekyn2ZhdU9czvQrcLSpo1b0wIzRX__DxLFk89L4Y0NZ8FiwQ/viewform?usp=header');
    $button->setAttribute('target', '_blank');
    $button->setAttribute('class', 'hire-us-button');

    $button_container->appendChild($button);
    $article->appendChild($button_container);
}

// Helper function to update the Subsidiaries content
function updateSubsidiariesContent($dom, $article, $htmlContent) {
    // Keep the title
    $title = null;

    // Find the title element
    $xpath = new DOMXPath($dom);
    $title = $xpath->query(".//h2[@class='major']", $article)->item(0);

    // Remove all child nodes
    while ($article->firstChild) {
        $article->removeChild($article->firstChild);
    }

    // Add back the title
    if ($title) {
        $article->appendChild($title);
    }

    // Create the subsidiaries grid
    $grid = $dom->createElement('div');
    $grid->setAttribute('class', 'subsidiaries-grid');
    $article->appendChild($grid);

    // Parse the HTML content
    $contentDom = new DOMDocument();
    libxml_use_internal_errors(true);
    $contentDom->loadHTML('<div>' . $htmlContent . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();

    // Get all h3 elements from the content (each represents a subsidiary)
    $contentXpath = new DOMXPath($contentDom);
    $headings = $contentXpath->query('//h3');

    // Process each heading as a subsidiary
    foreach ($headings as $heading) {
        $headingText = $heading->textContent;
        $card_id = strtolower(str_replace(' ', '-', $headingText)) . '-card';
        $subsidiary_name = strtolower(str_replace(' ', '', $headingText));

        // Create the card
        $card = $dom->createElement('div');
        $card->setAttribute('class', 'subsidiary-card');
        $card->setAttribute('id', $card_id);

        // Add the heading
        $cardHeading = $dom->createElement('h3', $headingText);
        $card->appendChild($cardHeading);

        // Find the image that follows this heading
        $nextElement = $heading->nextSibling;
        while ($nextElement && $nextElement->nodeType !== XML_ELEMENT_NODE) {
            $nextElement = $nextElement->nextSibling;
        }

        // Add the image
        if ($nextElement && $nextElement->nodeName === 'span' && strpos($nextElement->getAttribute('class'), 'image') !== false) {
            // Import the image element
            $importedImage = $dom->importNode($nextElement, true);
            $card->appendChild($importedImage);

            // Move to the next element
            $nextElement = $nextElement->nextSibling;
            while ($nextElement && $nextElement->nodeType !== XML_ELEMENT_NODE) {
                $nextElement = $nextElement->nextSibling;
            }
        } else {
            // Use default image if none found
            $image_container = $dom->createElement('span');
            $image_container->setAttribute('class', 'image subsidiary');

            $image = $dom->createElement('img');
            $image->setAttribute('src', 'images/' . ($subsidiary_name === 'aydoexpress' ? 'Logistics_logo_DISC.png' : 'Empyrion_Industries_disc.png'));
            $image->setAttribute('alt', $headingText . ' Logo');

            $image_container->appendChild($image);
            $card->appendChild($image_container);
        }

        // Add the paragraph
        if ($nextElement && $nextElement->nodeName === 'p') {
            // Import the paragraph element
            $importedParagraph = $dom->importNode($nextElement, true);
            $card->appendChild($importedParagraph);
        } else {
            // Add empty paragraph if none found
            $paragraph = $dom->createElement('p', 'No description available.');
            $card->appendChild($paragraph);
        }

        // Add the button
        $button = $dom->createElement('button', 'Learn More');
        $button->setAttribute('class', 'subsidiary-more');
        $button->setAttribute('data-subsidiary', $subsidiary_name);
        $card->appendChild($button);

        // Add the card to the grid
        $grid->appendChild($card);
    }
}

// Helper function to update the Contact content
function updateContactContent($dom, $article, $htmlContent) {
    // Keep the title and form
    $title = null;
    $form = null;

    // Find the title and form elements
    $xpath = new DOMXPath($dom);
    $title = $xpath->query(".//h2[@class='major']", $article)->item(0);
    $form = $xpath->query(".//form", $article)->item(0);

    // Remove all child nodes
    while ($article->firstChild) {
        $article->removeChild($article->firstChild);
    }

    // Add back the title and form
    if ($title) {
        $article->appendChild($title);
    }
    if ($form) {
        $article->appendChild($form);
    }

    // Parse the HTML content
    $contentDom = new DOMDocument();
    libxml_use_internal_errors(true);
    $contentDom->loadHTML('<div>' . $htmlContent . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();

    // Get all elements from the content
    $contentXpath = new DOMXPath($contentDom);
    $elements = $contentXpath->query('//div/*');

    // Process each element
    foreach ($elements as $element) {
        // Skip elements we've already added (title, form)
        if (($element->nodeName === 'h2' && strpos($element->getAttribute('class'), 'major') !== false) ||
            $element->nodeName === 'form') {
            continue;
        }

        // Special handling for contact channels list
        if ($element->nodeName === 'h4' && $element->textContent === 'Contact channels:') {
            // Find the next ul element
            $nextElement = $element->nextSibling;
            while ($nextElement && ($nextElement->nodeType !== XML_ELEMENT_NODE || $nextElement->nodeName !== 'ul')) {
                $nextElement = $nextElement->nextSibling;
            }

            if ($nextElement && $nextElement->nodeName === 'ul') {
                // Create the contact info list
                $contact_info = $dom->createElement('ul');
                $contact_info->setAttribute('class', 'contact-info');

                // Add each list item
                $items = $nextElement->getElementsByTagName('li');
                foreach ($items as $item) {
                    $importedItem = $dom->importNode($item, true);
                    $contact_info->appendChild($importedItem);
                }

                $article->appendChild($contact_info);
            } else {
                // If no ul found, just add the heading
                $importedHeading = $dom->importNode($element, true);
                $article->appendChild($importedHeading);
            }
        } else {
            // Add other elements directly
            $importedNode = $dom->importNode($element, true);
            $article->appendChild($importedNode);
        }
    }
}
?>
