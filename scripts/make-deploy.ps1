# EN-ER Textile Inventory — Deployment Package Builder
# Run after: npm run build
# Output: deploy\en-er-inventory.zip

$ROOT = Split-Path $PSScriptRoot -Parent
$DIST = "$ROOT\deploy\en-er-inventory"

Write-Host "Cleaning old package..." -ForegroundColor Cyan
if (Test-Path "$ROOT\deploy") { Remove-Item "$ROOT\deploy" -Recurse -Force }
New-Item -ItemType Directory -Path $DIST | Out-Null

# 1. Copy standalone build (contains self-contained server + minimal node_modules)
Write-Host "Copying standalone build..." -ForegroundColor Cyan
Copy-Item "$ROOT\.next\standalone\*" -Destination $DIST -Recurse

# 2. Copy static assets into standalone (Next.js requires this layout)
Write-Host "Copying static assets..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "$DIST\.next\static" -Force | Out-Null
Copy-Item "$ROOT\.next\static\*" -Destination "$DIST\.next\static" -Recurse

# 3. Copy public folder
if (Test-Path "$ROOT\public") {
    Write-Host "Copying public folder..." -ForegroundColor Cyan
    Copy-Item "$ROOT\public" -Destination "$DIST\public" -Recurse
}

# 4. Copy PM2 config
Copy-Item "$ROOT\ecosystem.config.js" -Destination $DIST

# 5. Write production .env template
Write-Host "Writing .env.production template..." -ForegroundColor Cyan
@"
# EN-ER Textile — Production Environment
# Fill in your values before deploying

GOOGLE_SERVICE_ACCOUNT_EMAIL=en-er-invent@en-er-502013.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=1b96W5S8PPYxCF9tKNYAREWBCdewv4hV1jqEpr5PAHEs

# IMPORTANT: Change these for production
NEXTAUTH_URL=https://YOUR_DOMAIN_HERE
NEXTAUTH_SECRET=REPLACE_WITH_RANDOM_32_CHAR_STRING

ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_THIS_PASSWORD
"@ | Out-File -FilePath "$DIST\.env.production.template" -Encoding utf8

# 6. Write quick-start README for server
@"
# EN-ER Textile Inventory — Server Setup

## 1. Upload this folder to server
scp -r en-er-inventory user@your-server:/var/www/

## 2. SSH into server
ssh user@your-server
cd /var/www/en-er-inventory

## 3. Create .env.local (fill in your values)
cp .env.production.template .env.local
nano .env.local

## 4. Install PM2 (once)
npm install -g pm2

## 5. Start the app
pm2 start ecosystem.config.js
pm2 startup   # copy and run the printed command
pm2 save

## 6. Plesk Reverse Proxy
- Domains > your-domain > Apache & nginx Settings
- Additional nginx directives:
  location / {
      proxy_pass http://127.0.0.1:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
  }

## 7. Verify
- https://your-domain/stock     — public stock page
- https://your-domain/login     — admin login (admin / your-password)
"@ | Out-File -FilePath "$DIST\DEPLOY.md" -Encoding utf8

# 7. Zip everything (use ZipFile so contents extract flat, no parent folder prefix)
Write-Host "Creating zip archive..." -ForegroundColor Cyan
$zipPath = "$ROOT\deploy\en-er-inventory.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($DIST, $zipPath)

$zipSize = [math]::Round((Get-Item "$ROOT\deploy\en-er-inventory.zip").Length / 1MB, 1)
Write-Host ""
Write-Host "Done! Package ready:" -ForegroundColor Green
Write-Host "  deploy\en-er-inventory.zip  ($zipSize MB)" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Upload deploy\en-er-inventory.zip to your server"
Write-Host "  2. Unzip and follow DEPLOY.md inside the zip"
