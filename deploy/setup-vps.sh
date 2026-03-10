#!/bin/bash
# Setup script for immo-locator-api on a Debian VPS
#
# Usage:
#   ssh -p <PORT> -i <KEY> <USER>@<HOST> 'bash -s' < deploy/setup-vps.sh <SERVER_HOSTNAME> <UNIX_USER> <CERTBOT_EMAIL> <APP_PORT>
#
# Example:
#   ssh -p 22 -i ~/.ssh/id_ed25519 debian@my-server.com 'bash -s' < deploy/setup-vps.sh my-server.com debian admin@example.com 3000
set -euo pipefail

SERVER_HOSTNAME="${1:?Usage: setup-vps.sh <SERVER_HOSTNAME> <UNIX_USER> <CERTBOT_EMAIL> <APP_PORT>}"
UNIX_USER="${2:-debian}"
CERTBOT_EMAIL="${3:-admin@example.com}"
APP_PORT="${4:-3000}"
APP_DIR="/opt/immo-locator-api"

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
sudo mkdir -p "${APP_DIR}"
sudo chown "${UNIX_USER}:${UNIX_USER}" "${APP_DIR}"

echo "=== 7. Configure Nginx ==="
sudo tee /etc/nginx/sites-available/immo-locator-api > /dev/null <<NGINX
server {
    listen 80;
    server_name ${SERVER_HOSTNAME};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
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
NGINX

sudo ln -sf /etc/nginx/sites-available/immo-locator-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "=== 8. Setup SSL with Let's Encrypt ==="
echo "Attempting SSL certificate..."
sudo certbot --nginx -d "${SERVER_HOSTNAME}" --non-interactive --agree-tos --email "${CERTBOT_EMAIL}" || {
  echo "WARNING: SSL setup failed. This is expected if the hostname doesn't have a proper DNS record."
  echo "You can run 'sudo certbot --nginx -d ${SERVER_HOSTNAME}' manually later."
  echo "The API will work over HTTP in the meantime."
}

echo "=== 9. Configure PM2 startup ==="
pm2 startup systemd -u "${UNIX_USER}" --hp "/home/${UNIX_USER}" | tail -1 | sudo bash || true

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Deploy the app: ./deploy/deploy.sh"
echo "  2. Create .env file in ${APP_DIR}"
echo "  3. Start: cd ${APP_DIR} && pm2 start src/index.js --name immo-locator-api"
echo "  4. Save PM2: pm2 save"
