#!/bin/bash
# Deploy immo-locator-api to VPS
# Run from local machine: ./deploy/deploy.sh
set -euo pipefail

VPS_HOST="debian@api.immolocator.fr"
VPS_PORT="65422"
SSH_KEY="~/.ssh/id_ed25519_vps"
APP_DIR="/opt/immo-locator-api"
SSH_OPTS="-p ${VPS_PORT} -i ${SSH_KEY}"

echo "=== Deploying immo-locator-api ==="

echo "1. Syncing files to VPS..."
rsync -avz -e "ssh ${SSH_OPTS}" \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.git' \
  --exclude '.claude' \
  --exclude 'logs' \
  --exclude 'data' \
  --exclude 'tests' \
  --exclude 'deploy' \
  --exclude 'PLAN.md' \
  ~/immo-locator-api/ "${VPS_HOST}:${APP_DIR}/"

echo "2. Installing dependencies on VPS..."
ssh ${SSH_OPTS} "${VPS_HOST}" "cd ${APP_DIR} && npm install --production"

echo "3. Restarting app with PM2..."
ssh ${SSH_OPTS} "${VPS_HOST}" "cd ${APP_DIR} && pm2 restart immo-locator-api 2>/dev/null || pm2 start src/index.js --name immo-locator-api && pm2 save"

echo "4. Checking health..."
sleep 2
ssh ${SSH_OPTS} "${VPS_HOST}" "curl -s http://127.0.0.1:3000/health"
echo ""

echo "=== Deploy complete ==="
