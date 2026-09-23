# serve.ps1 - simple static file server for the dashboard, no Node/Python required.
# Run:  powershell -ExecutionPolicy Bypass -File .\serve.ps1
# Then open: http://localhost:5500

param(
  [int]$Port = 5500
)

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  Write-Host "Could not listen on port $Port. Try: .\serve.ps1 -Port 5510" -ForegroundColor Red
  exit 1
}

Write-Host "Server running at: $prefix" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

$mimeMap = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response

  $localPath = $request.Url.LocalPath
  if ($localPath -eq "/") { $localPath = "/index.html" }
  $filePath = Join-Path $root ($localPath.TrimStart("/") -replace "/", "\")

  if (Test-Path $filePath -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($filePath)
    $contentType = $mimeMap[$ext]
    if (-not $contentType) { $contentType = "application/octet-stream" }
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $response.ContentType = $contentType
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $response.StatusCode = 404
    $notFoundText = "404 Not Found: " + $localPath
    $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes($notFoundText)
    $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
  }
  $response.OutputStream.Close()
}
