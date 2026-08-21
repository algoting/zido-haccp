#!/bin/bash
# ============================================================================
# HACCP App - VPS Setup Script (Hostinger Ubuntu)
# Run this on your VPS: bash setup-vps.sh
# ============================================================================
set -e

echo "========================================="
echo "  HACCP App - VPS Setup"
echo "========================================="

# --- 1. System updates ---
echo "[1/8] Updating system..."
apt update && apt upgrade -y

# --- 2. Install essentials ---
echo "[2/8] Installing essentials..."
apt install -y curl git nginx certbot python3-certbot-nginx ufw

# --- 3. Install Node.js 18 LTS ---
echo "[3/8] Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g pm2

echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "pm2: $(pm2 --version)"

# --- 4. Install Docker (for optional use) ---
echo "[4/8] Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# --- 5. Firewall ---
echo "[5/8] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# --- 6. Create app directory ---
echo "[6/8] Creating app directory..."
mkdir -p /opt/haccp/haccp-api
mkdir -p /opt/haccp/web
mkdir -p /opt/haccp/haccp-api/uploads/exports
mkdir -p /opt/haccp/haccp-api/uploads/pms
mkdir -p /opt/haccp/haccp-api/uploads/products

# --- 7. Nginx config ---
echo "[7/8] Setting up Nginx..."
# Will be configured after files are uploaded

# --- 8. Done ---
echo "[8/8] Setup complete!"
echo ""
echo "========================================="
echo "  Next steps:"
echo "  1. Upload your code to /opt/haccp/"
echo "  2. Configure .env.production"
echo "  3. Run: cd /opt/haccp/haccp-api && npm ci --only=production"
echo "  4. Run: npx prisma generate && npx prisma migrate deploy"
echo "  5. Run: pm2 start dist/main.js --name haccp-api"
echo "  6. Setup SSL: certbot --nginx -d zidohaccp.com -d www.zidohaccp.com -d app.zidohaccp.com"
echo "========================================="
