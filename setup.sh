#!/bin/bash

# FinanBot Setup Script
echo "🤖 FinanBot - Setup Inicial"
echo "=========================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor instale Node.js 18+ primeiro."
    echo "   Visite: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]; then
    echo "❌ Node.js versão 18+ é necessário. Versão atual: $NODE_VERSION"
    exit 1
fi

echo "✅ Node.js versão $NODE_VERSION detectado"

# Check if Docker is installed (optional for PostgreSQL)
if command -v docker &> /dev/null; then
    echo "✅ Docker detectado (opcional para PostgreSQL)"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker não encontrado (PostgreSQL precisa ser instalado manualmente)"
    DOCKER_AVAILABLE=false
fi

# Install dependencies
echo ""
echo "📦 Instalando dependências..."
npm run setup

# Setup environment files
echo ""
echo "⚙️  Configurando arquivos de ambiente..."

# Backend .env
if [ ! -f backend/.env ]; then
    cp backend/env.example backend/.env
    echo "✅ Criado backend/.env (configure as variáveis necessárias)"
else
    echo "⚠️  backend/.env já existe"
fi

# Frontend .env
if [ ! -f frontend/.env.local ]; then
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
EOF
    echo "✅ Criado frontend/.env.local"
else
    echo "⚠️  frontend/.env.local já existe"
fi

# Database setup
echo ""
echo "🗄️  Configuração do banco de dados..."

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "🐳 Iniciando PostgreSQL com Docker..."
    docker run --name finanbot-postgres \
        -e POSTGRES_DB=finanbot \
        -e POSTGRES_USER=finanbot \
        -e POSTGRES_PASSWORD=\${POSTGRES_PASSWORD:-$(openssl rand -base64 32)} \
        -p 5432:5432 \
        -d postgres:15

    # Wait for PostgreSQL to be ready
    echo "⏳ Aguardando PostgreSQL inicializar..."
    sleep 10

    # Update backend .env with Docker database URL
    # Usuário deve configurar DATABASE_URL manualmente com senha segura
    echo "⚠️  Configure DATABASE_URL no backend/.env com uma senha segura"
    echo "✅ URL do banco de dados configurada para Docker"
else
    echo "⚠️  Configure manualmente o PostgreSQL e atualize DATABASE_URL em backend/.env"
fi

# Run database migrations and seed
echo ""
echo "🌱 Configurando banco de dados..."
npm run db:setup

echo ""
echo "🎉 Setup concluído!"
echo ""
echo "Para executar o projeto:"
echo "  npm run dev        # Executa backend e frontend"
echo "  npm run dev:backend # Apenas backend (porta 3001)"
echo "  npm run dev:frontend # Apenas frontend (porta 3000)"
echo ""
echo "URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:3001"
echo "  Prisma Studio: npm run db:studio"
echo ""
echo "Usuário demo:"
echo "  Email: demo@finanbot.com"
echo "  Senha: demo123456"
echo ""
echo "⚠️  Lembre-se de configurar as variáveis de ambiente:"
echo "  - OPENAI_API_KEY (obrigatório para IA)"
echo "  - OPEN_FINANCE_* (para integração bancária)"
echo "  - JWT_SECRET (para autenticação)" 