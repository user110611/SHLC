#!/bin/bash
# RasCloud Server - Quick Start Script for Linux / Android (Termux)
# Usage: ./start.sh [port]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed."
  echo ""
  echo "Install it with:"
  echo "  Termux (Android):  pkg install nodejs"
  echo "  Ubuntu/Debian:     sudo apt install nodejs npm"
  echo "  Arch:              sudo pacman -S nodejs npm"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -e "process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)" 2>&1)
if [ $? -ne 0 ]; then
  echo "WARNING: Node.js 18+ is recommended. You have: $(node --version)"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  if command -v npm &> /dev/null; then
    npm install
  else
    echo "ERROR: npm not found. Install Node.js with npm."
    exit 1
  fi
fi

# Set port from argument or environment
if [ -n "$1" ]; then
  export PORT="$1"
fi

echo "Starting RasCloud Server..."
node server.js
