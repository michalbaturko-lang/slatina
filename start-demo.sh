#!/bin/bash
# =============================================================================
# Slatina - Quick Start Demo
# =============================================================================
# Spustí demo verzi platformy bez AWS
# Požadavky: Docker, Node.js 18+, pnpm
# =============================================================================

set -e

echo "🎬 Slatina - Sports Video Analysis Platform"
echo "==========================================="
echo ""

# Check requirements
command -v docker >/dev/null 2>&1 || { echo "❌ Docker není nainstalován. Nainstalujte z https://docker.com"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js není nainstalován. Nainstalujte z https://nodejs.org"; exit 1; }

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Potřebujete Node.js 18+. Máte verzi $(node -v)"
    exit 1
fi

echo "✅ Docker nalezen"
echo "✅ Node.js $(node -v) nalezen"
echo ""

# Install pnpm if needed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Instaluji pnpm..."
    npm install -g pnpm
fi

echo "📦 Instaluji závislosti..."
pnpm install

echo ""
echo "🐳 Spouštím databázi a úložiště..."
docker-compose up -d postgres redis minio minio-setup

echo ""
echo "⏳ Čekám na spuštění služeb..."
sleep 5

echo ""
echo "🔧 Připravuji databázi..."
cd apps/api && npx prisma generate && npx prisma db push && cd ../..

echo ""
echo "🚀 Spouštím aplikaci..."
echo ""
echo "==========================================="
echo "Frontend: http://localhost:3000"
echo "API:      http://localhost:3001"
echo "MinIO:    http://localhost:9001 (admin/minioadmin)"
echo "==========================================="
echo ""
echo "Pro zastavení: Ctrl+C a pak 'docker-compose down'"
echo ""

# Run both frontend and backend
pnpm dev
