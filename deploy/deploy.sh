#!/bin/bash
# Deploy immo-locator-api to VPS
# Run from local machine: ./deploy/deploy.sh
set -euo pipefail

VPS_HOST="debian@vps-9f0f5451.vps.ovh.net"
APP_DIR="/opt/immo-locator-api"

echo "=== Deploying immo-locator-api ==="

echo "1. Syncing files to VPS..."
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude '.git' \
  ~/immo-locator-api/ "${VPS_HOST}:${APP_DIR}/"

echo "2. Installing dependencies on VPS..."
ssh "${VPS_HOST}" "cd ${APP_DIR} && npm install --production"

echo "3. Restarting app with PM2..."
ssh "${VPS_HOST}" "cd ${APP_DIR} && pm2 restart immo-locator-api 2>/dev/null || pm2 start src/index.js --name immo-locator-api && pm2 save"

echo "4. Checking health..."
sleep 2
ssh "${VPS_HOST}" "curl -s http://127.0.0.1:3000/health"
echo ""

echo "=== Deploy complete ==="
