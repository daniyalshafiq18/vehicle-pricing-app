param(
    [string]$websiteId = "0abd4358-eca4-4753-97d3-391d5a1cb38c",
    [string]$siteName = "Vehicle Pricing Intelligence Platform"
)

Write-Host "1/3 Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

Write-Host "2/3 Downloading fresh portal state..." -ForegroundColor Cyan
pac pages download-code-site --path ./ --websiteid $websiteId --overwrite
if ($LASTEXITCODE -ne 0) { throw "Download failed" }

Write-Host "3/3 Uploading to Power Pages..." -ForegroundColor Cyan
pac pages upload-code-site --rootPath ".\vehicle-pricing-intelligence-platform" --compiledPath ".\dist" --siteName $siteName
if ($LASTEXITCODE -ne 0) { throw "Upload failed" }

Write-Host "Done!" -ForegroundColor Green
