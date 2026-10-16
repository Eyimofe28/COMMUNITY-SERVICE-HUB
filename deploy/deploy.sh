#!/usr/bin/env bash
# Updates the live site on the school server with the latest code from GitHub.
#
#   bash deploy/deploy.sh
#
# Steps: pull latest code -> install backend packages -> build the frontend ->
# copy it into ~/public_html -> restart the backend.
#
# One-time setup (see the deployment guide) must be done first:
#   - community-service-backend/.env                     (DATABASE_URL, JWT_SECRET, PORT, CORS_ORIGIN)
#   - community-service-frontend/.env.production.local   (PUBLIC_URL, REACT_APP_API_URL)
#   - community-service-backend/ssl/key.pem + cert.pem   (HTTPS certificate)

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

for f in community-service-backend/.env community-service-frontend/.env.production.local; do
  if [ ! -f "$f" ]; then
    echo "Missing $f - do the one-time setup first."
    exit 1
  fi
done

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Installing backend packages"
npm ci --omit=dev

echo "==> Building frontend"
(cd community-service-frontend && npm ci && npm run build)

echo "==> Publishing frontend to ~/public_html"
mkdir -p "$HOME/public_html"
cp -r community-service-frontend/build/. "$HOME/public_html/"

echo "==> Restarting backend"
bash deploy/start-backend.sh

echo "==> Done"
