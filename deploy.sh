#!/bin/bash

# ==============================================================================
# 🚀 Zido HACCP Application - Automatic VPS Deployment Script
# ==============================================================================
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh your-domain.com
# ==============================================================================

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "================================================================="
  echo "⚠️  ERROR: Domain name required!"
  echo "Usage: ./deploy.sh your-domain.com"
  echo "Example: ./deploy.sh app.zidohaccp.com"
  echo "================================================================="
  exit 1
fi

echo "================================================================="
echo "🚀 Starting VPS Deployment for: $DOMAIN"
echo "================================================================="

# 1. Update system packages
echo "📦 Updating system packages..."
sudo apt-get update -y && sudo apt-get install -y curl git unzip nginx certbot python3-certbot-nginx

# 2. Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# 3. Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo apt-get install -y docker-compose-plugin docker-compose
fi

# 4. Stop existing containers if running
echo "⏹️  Stopping old Docker containers if active..."
sudo docker-compose down || true

# 5. Build and launch Backend & PostgreSQL stack
echo "🏗️  Building and launching Docker stack (PostgreSQL + NestJS API)..."
sudo docker-compose up --build -d

# 6. Wait for PostgreSQL & Backend to initialize
echo "⏳ Waiting for database & API containers to start (15 seconds)..."
sleep 15

# 7. Run Prisma migrations and seed database
echo "🗄️  Running database migrations..."
sudo docker-compose exec -T api npx prisma db push --skip-generate || true

# 8. Configure Nginx Reverse Proxy
echo "🌐 Configuring Nginx for $DOMAIN..."
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
APP_PATH=$(pwd)

sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    client_max_body_size 50M;

    # Serve React Frontend Static Files
    location / {
        root $APP_PATH/web;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Reverse Proxy for NestJS Backend API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Link Nginx configuration and restart service
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo "================================================================="
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "================================================================="
echo "🌐 Your application is live at: http://$DOMAIN"
echo "⚡ Backend API is live at: http://$DOMAIN/api"
echo ""
echo "🔐 To enable FREE SSL (HTTPS) with Let's Encrypt, run:"
echo "   sudo certbot --nginx -d $DOMAIN"
echo "================================================================="
