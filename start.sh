#!/usr/bin/env bash
set -e

if [ ! -f .env ]; then
  echo "⚠️  .env not found. Copying from .env.example — edit it before running again!"
  cp .env.example .env
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo "🚀 Starting CONFIG LICENSE SERVER..."
npm start
