# Deployment Guide — Qaswa Textile Inventory

## Prerequisites
- Plesk control panel access at https://eu1.limitless.cyou:2222/evo/
- SSH access to the server
- Node.js 18+ installed on server
- Google Cloud service account with Sheets API access

## Steps

### 1. Google Cloud Setup
1. Go to console.cloud.google.com
2. Create a project → Enable Google Sheets API
3. Create Service Account → Download JSON key
4. Open the JSON key file, copy `client_email` and `private_key`
5. Create a new Google Sheet → Share it with the service account email (Editor role)
6. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/`

### 2. Server Setup
```bash
# SSH into server
ssh user@eu1.limitless.cyou

# Install Node.js 18 (if not present)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
npm install -g pm2

# Create app directory
mkdir -p /var/www/qaswa-inventory
cd /var/www/qaswa-inventory
```

### 3. Deploy App
```bash
# Upload files (from local machine)
scp -r . user@eu1.limitless.cyou:/var/www/qaswa-inventory/

# On server: install and build
cd /var/www/qaswa-inventory
npm install
npm run build
```

### 4. Configure Environment
Create `/var/www/qaswa-inventory/.env.local`:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYOUR_KEY\n-----END RSA PRIVATE KEY-----"
GOOGLE_SHEET_ID=your_sheet_id_here
NEXTAUTH_SECRET=run-openssl-rand-base64-32
NEXTAUTH_URL=https://your-domain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

### 5. Seed Google Sheets (run once)
```bash
npx ts-node --project tsconfig.json scripts/seed-sheets.ts
```

### 6. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 startup   # follow the printed command to enable auto-start
pm2 save
```

### 7. Plesk Reverse Proxy
In Plesk:
1. Domains → your domain → Node.js
2. Application root: `/var/www/qaswa-inventory`
3. Application URL: your domain
4. Enable reverse proxy → Application port: `3000`
5. SSL: Enable Let's Encrypt

### 8. Verify
- Visit `https://your-domain.com/stock` → should show stock table
- Visit `https://your-domain.com/admin/login` → should show login form

## Updating the App
```bash
cd /var/www/qaswa-inventory
git pull   # or re-upload files
npm install
npm run build
pm2 restart qaswa-inventory
```
