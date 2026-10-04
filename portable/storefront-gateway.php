<?php
// Public metadata only. No hosting or Cloudflare credentials are stored here.
header('Cache-Control: no-store, max-age=0');
header('X-Robots-Tag: noindex');
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$sitemap = $path === '/sitemap.xml';
$slug = '';
if (!$sitemap && !preg_match('~^/products/([a-z0-9][a-z0-9_-]{0,239})(?:\.html)?/?$~', $path, $match)) {
    header('Location: /#collection', true, 302); exit;
}
if (!$sitemap) $slug = $match[1];
$endpoint = 'https://api.vantanoir.store/api/storefront-visibility?' . ($sitemap ? 'mode=sitemap' : 'slug=' . rawurlencode($slug));
$status = 0; $body = false;
if (function_exists('curl_init')) {
    $curl = curl_init($endpoint);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 10]);
    $body = curl_exec($curl); $status = curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
}
if (!$sitemap && $status === 404) { header('Location: /#collection', true, 302); exit; }
$data = is_string($body) ? json_decode($body, true) : null;
if ($status !== 200 || !is_array($data)) {
    http_response_code(503); header('Retry-After: 30');
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="en"><title>Vanta Noir</title><h1>Vanta Noir</h1><p>Please try again shortly.</p><a href="/">Return to the store</a></html>'; exit;
}
function esc($text) { return htmlspecialchars((string)$text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
if ($sitemap) {
    if (!isset($data['slugs']) || !is_array($data['slugs'])) { http_response_code(503); exit; }
    header_remove('X-Robots-Tag'); header('Content-Type: application/xml; charset=utf-8');
    // Static public pages plus only currently published garments.
    $xml = file_get_contents(__DIR__ . '/sitemap.xml');
    if ($xml === false || strpos($xml, '</urlset>') === false) { http_response_code(503); exit; }
    $entries = '';
    foreach ($data['slugs'] as $value) {
        if (is_string($value) && preg_match('~^[a-z0-9][a-z0-9_-]{0,239}$~', $value)) $entries .= '<url><loc>https://vantanoir.store/products/' . esc($value) . '</loc></url>';
    }
    echo str_replace('</urlset>', $entries . '</urlset>', $xml); exit;
}
if (($data['slug'] ?? '') !== $slug || !isset($data['title'], $data['description'])) { http_response_code(503); exit; }
$html = file_get_contents(__DIR__ . '/products/_dynamic.html');
if ($html === false) { http_response_code(503); exit; }
// Bootstrap the canonical product path even when the incoming URL ends in .html.
$html = str_replace('"path":"/products/_dynamic"', '"path":"/products/' . $slug . '"', $html);
$canonical = 'https://vantanoir.store/products/' . $slug;
$image = $data['image'] ?? '';
if (strpos($image, '/') === 0 && strpos($image, '//') !== 0) $image = 'https://vantanoir.store' . $image;
if (!preg_match('~^https://~i', $image)) $image = '';
$html = preg_replace_callback('~<title>.*?</title>~s', function () use ($data) { return '<title>' . esc($data['title']) . '</title>'; }, $html, 1);
$html = preg_replace_callback('~<meta (?:name|property)="(description|og:title|og:description|og:image|twitter:title|twitter:description|twitter:image|robots)" content="[^"]*">~', function ($m) use ($data, $image) {
    if ($m[1] === 'robots') return '';
    $value = strpos($m[1], 'image') !== false ? $image : (strpos($m[1], 'title') !== false ? $data['title'] : $data['description']);
    $attribute = strpos($m[1], 'og:') === 0 ? 'property' : 'name';
    return '<meta ' . $attribute . '="' . $m[1] . '" content="' . esc($value) . '">';
}, $html);
$html = str_replace('</head>', '<link rel="canonical" href="' . esc($canonical) . '"><meta property="og:url" content="' . esc($canonical) . '"></head>', $html);
// Only live, publication-checked product data enters search markup.
if (isset($data['structuredData']) && is_array($data['structuredData'])) {
    $json = json_encode($data['structuredData'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES);
    if ($json !== false) $html = str_replace('</head>', '<script type="application/ld+json">' . $json . '</script></head>', $html);
}
header_remove('X-Robots-Tag'); header('Content-Type: text/html; charset=utf-8'); echo $html;
