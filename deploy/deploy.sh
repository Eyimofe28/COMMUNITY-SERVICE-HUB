#!/usr/bin/env bash
# Updates the live site on the school server with the latest code from GitHub.
#
#   bash deploy/deploy.sh
#
# Steps: pull latest code -> install backend packages -> apply database
# migrations -> build the frontend -> copy it into ~/public_html -> restart the backend.
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

# Apply any new database migrations. If one fails it is rolled back and the
# deploy stops here, so the running site keeps its current code and database.
echo "==> Applying database migrations"
npm run -s db:migrate

echo "==> Building frontend"
(cd community-service-frontend && npm ci && npm run build)

# Publish into the folder that matches PUBLIC_URL:
#   PUBLIC_URL=/~username/community-service-hub  ->  ~/public_html/community-service-hub/
#   PUBLIC_URL=/~username                        ->  ~/public_html/
PUBLIC_URL="$(grep -E '^PUBLIC_URL=' community-service-frontend/.env.production.local | tail -n 1 | cut -d= -f2- | tr -d '\r"')"
SUBFOLDER="$(echo "$PUBLIC_URL" | sed -E 's#^/~[^/]+##; s#/+$##')"
TARGET="$HOME/public_html$SUBFOLDER"

echo "==> Publishing frontend to $TARGET"
if [ -n "$SUBFOLDER" ]; then
  # The app owns this sub-folder, so clear out the previous build first
  rm -rf "$TARGET"
fi
mkdir -p "$TARGET"
cp -r community-service-frontend/build/. "$TARGET/"

echo "==> Restarting backend"
bash deploy/start-backend.sh

echo "==> Done"
