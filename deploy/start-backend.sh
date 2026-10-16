#!/usr/bin/env bash
# Starts (or restarts) the backend on the school server so it keeps running
# after you log out. Safe to run again at any time.
#
#   bash deploy/start-backend.sh
#
# Output goes to backend.log in the project root; the process ID is kept in backend.pid.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# Load the Node version installed with nvm (the system Node is too old)
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Stop the previous backend, if it is still running
if [ -f backend.pid ] && kill -0 "$(cat backend.pid)" 2>/dev/null; then
  echo "Stopping backend (PID $(cat backend.pid))..."
  kill "$(cat backend.pid)"
  sleep 2
fi

echo "Starting backend with Node $(node -v)..."
nohup node community-service-backend/server.js >> backend.log 2>&1 &
echo $! > backend.pid
disown

sleep 3
if kill -0 "$(cat backend.pid)" 2>/dev/null; then
  echo "Backend running (PID $(cat backend.pid)). Last log lines:"
  tail -n 5 backend.log
else
  echo "Backend failed to start. Last log lines:"
  tail -n 20 backend.log
  exit 1
fi
