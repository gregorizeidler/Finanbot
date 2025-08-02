#!/bin/bash

# FinanBot Production Deployment Script
set -e

echo "🚀 FinanBot - Deploy para Produção"
echo "=================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado. Copie .env.production para .env e configure as variáveis."
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=(
    "DOMAIN"
    "JWT_SECRET"
    "OPENAI_API_KEY"
    "POSTGRES_PASSWORD"
    "OPEN_FINANCE_CLIENT_ID"
    "OPEN_FINANCE_CLIENT_SECRET"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Variável de ambiente $var não configurada"
        exit 1
    fi
done

echo "✅ Variáveis de ambiente validadas"

# Build production images
echo ""
echo "🏗️  Construindo imagens de produção..."
docker-compose -f docker-compose.yml build --no-cache

# Stop existing containers
echo ""
echo "🛑 Parando containers existentes..."
docker-compose -f docker-compose.yml down

# Start production environment
echo ""
echo "🚀 Iniciando ambiente de produção..."
docker-compose -f docker-compose.yml up -d

# Wait for services to be ready
echo ""
echo "⏳ Aguardando serviços iniciarem..."
sleep 30

# Run database migrations
echo ""
echo "🗄️  Executando migrações do banco de dados..."
docker-compose -f docker-compose.yml exec backend npm run db:deploy

# Health check
echo ""
echo "🔍 Verificando saúde dos serviços..."

# Check backend health
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend API funcionando"
else
    echo "❌ Backend API com problemas"
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend funcionando"
else
    echo "❌ Frontend com problemas"
    exit 1
fi

# Check database connection
if docker-compose -f docker-compose.yml exec -T postgres pg_isready -U finanbot > /dev/null 2>&1; then
    echo "✅ Banco de dados conectado"
else
    echo "❌ Banco de dados com problemas"
    exit 1
fi

echo ""
echo "🎉 Deploy concluído com sucesso!"
echo ""
echo "🌐 URLs de acesso:"
echo "   Frontend: https://$DOMAIN"
echo "   Backend API: https://api.$DOMAIN"
echo "   Logs: docker-compose logs -f"
echo ""
echo "🔧 Comandos úteis:"
echo "   Ver logs: docker-compose logs -f"
echo "   Parar: docker-compose down"
echo "   Reiniciar: docker-compose restart"
echo "   Backup DB: docker-compose exec postgres pg_dump -U finanbot finanbot > backup.sql"
echo ""
echo "📊 Monitoramento:"
echo "   Status: docker-compose ps"
echo "   Métricas: docker stats"
echo "   Logs de erro: docker-compose logs --tail=100 backend"

# Setup log rotation
echo ""
echo "📝 Configurando rotação de logs..."
sudo tee /etc/logrotate.d/finanbot > /dev/null <<EOF
/var/lib/docker/containers/*/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker kill --signal="USR1" \$(docker ps -q) 2>/dev/null || true
    endscript
}
EOF

echo "✅ Configuração de logs criada"

# Setup monitoring (basic)
echo ""
echo "📈 Configurando monitoramento básico..."
cat > monitor.sh << 'EOF'
#!/bin/bash
# Basic monitoring script for FinanBot

while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check services
    backend_status=$(docker-compose ps backend | grep -c "Up" || echo "0")
    frontend_status=$(docker-compose ps frontend | grep -c "Up" || echo "0")
    postgres_status=$(docker-compose ps postgres | grep -c "Up" || echo "0")
    
    # Log status
    echo "[$timestamp] Backend: $backend_status, Frontend: $frontend_status, DB: $postgres_status" >> /var/log/finanbot-monitor.log
    
    # Alert if any service is down
    if [ "$backend_status" -eq "0" ] || [ "$frontend_status" -eq "0" ] || [ "$postgres_status" -eq "0" ]; then
        echo "[$timestamp] ALERT: Services down!" >> /var/log/finanbot-alerts.log
        # Add webhook notification here if needed
    fi
    
    sleep 300  # Check every 5 minutes
done
EOF

chmod +x monitor.sh
echo "✅ Script de monitoramento criado (execute: ./monitor.sh &)"

echo ""
echo "🔒 Lembrete de segurança:"
echo "   1. Configure SSL/TLS certificates"
echo "   2. Configure firewall (portas 80, 443)"
echo "   3. Configure backup automático do banco"
echo "   4. Monitore logs regularmente"
echo "   5. Atualize dependências periodicamente" 