#!/bin/bash
# Deploy immo-locator-api to VPS
# Run from local machine: ./deploy/deploy.sh
#
# Configuration: copy deploy/.env.example to deploy/.env and fill in your values
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "${SCRIPT_DIR}/.env" ]]; then
  echo "ERROR: deploy/.env not found. Copy deploy/.env.example to deploy/.env and fill in your values."
  exit 1
fi
source "${SCRIPT_DIR}/.env"

SSH_OPTS="-p ${SSH_PORT} -i ${SSH_KEY}"
VPS_TARGET="${SSH_USER}@${SSH_HOST}"

echo "=== Deploying immo-locator-api to ${SSH_HOST} ==="

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
  "${SCRIPT_DIR}/../" "${VPS_TARGET}:${APP_DIR}/"

echo "2. Installing dependencies on VPS..."
ssh ${SSH_OPTS} "${VPS_TARGET}" "cd ${APP_DIR} && npm install --production"

echo "3. Restarting app with PM2..."
ssh ${SSH_OPTS} "${VPS_TARGET}" "cd ${APP_DIR} && pm2 restart immo-locator-api 2>/dev/null || pm2 start src/index.js --name immo-locator-api && pm2 save"

echo "4. Checking health..."
sleep 2
ssh ${SSH_OPTS} "${VPS_TARGET}" "curl -s http://127.0.0.1:${APP_PORT}/health"
echo ""

echo "=== Deploy complete ==="
