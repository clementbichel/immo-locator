#!/bin/bash
# Setup script for immo-locator-api on Debian VPS
# Run as: ssh -p 65422 debian@vps-9f0f5451.vps.ovh.net 'bash -s' < deploy/setup-vps.sh
set -euo pipefail

echo "=== 1. System update ==="
sudo apt-get update && sudo apt-get upgrade -y

echo "=== 2. Install Node.js 20 LTS ==="
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node.js $(node -v)"
echo "npm $(npm -v)"

echo "=== 3. Install PM2 globally ==="
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
fi

echo "=== 4. Install Nginx ==="
if ! command -v nginx &> /dev/null; then
  sudo apt-get install -y nginx
fi

echo "=== 5. Install Certbot for Let's Encrypt ==="
if ! command -v certbot &> /dev/null; then
  sudo apt-get install -y certbot python3-certbot-nginx
fi

echo "=== 6. Create app directory ==="
sudo mkdir -p /opt/immo-locator-api
sudo chown debian:debian /opt/immo-locator-api

echo "=== 7. Configure Nginx ==="
sudo tee /etc/nginx/sites-available/immo-locator-api > /dev/null <<'NGINX'
server {
    listen 80;
    server_name vps-9f0f5451.vps.ovh.net;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/immo-locator-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "=== 8. Setup SSL with Let's Encrypt ==="
echo "Attempting SSL certificate..."
sudo certbot --nginx -d vps-9f0f5451.vps.ovh.net --non-interactive --agree-tos --email admin@example.com || {
  echo "WARNING: SSL setup failed. This is expected if the hostname doesn't have a proper DNS record."
  echo "You can run 'sudo certbot --nginx -d vps-9f0f5451.vps.ovh.net' manually later."
  echo "The API will work over HTTP in the meantime."
}

echo "=== 9. Configure PM2 startup ==="
pm2 startup systemd -u debian --hp /home/debian | tail -1 | sudo bash || true

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Deploy the app: scp or git clone to /opt/immo-locator-api"
echo "  2. Run: cd /opt/immo-locator-api && npm install --production"
echo "  3. Create .env file"
echo "  4. Start: pm2 start src/index.js --name immo-locator-api"
echo "  5. Save PM2: pm2 save"
