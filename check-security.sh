#!/bin/bash

# 🔒 FinanBot Security Check Script
# Execute antes de fazer commits para verificar vazamentos

echo "🔍 Verificando segurança do FinanBot..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. Verificar se .gitignore existe
if [ ! -f ".gitignore" ]; then
    echo -e "${RED}❌ Arquivo .gitignore não encontrado!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ .gitignore encontrado${NC}"
fi

# 2. Verificar arquivos .env commitados
if git ls-files | grep -E "\.env$|\.env\.local$|\.env\.production$" >/dev/null 2>&1; then
    echo -e "${RED}❌ Arquivos .env encontrados no Git:${NC}"
    git ls-files | grep -E "\.env$|\.env\.local$|\.env\.production$"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Nenhum arquivo .env commitado${NC}"
fi

# 3. Verificar senhas hardcoded
echo -e "\n🔍 Procurando senhas hardcoded..."
HARDCODED_PASSWORDS=$(grep -r -E "(password|pwd|secret|key).*=.*['\"][^{$][^}$]*['\"]" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=.next \
    --exclude="*.md" \
    --exclude="check-security.sh" \
    --exclude="package-lock.json" \
    2>/dev/null | grep -v "fill-current\|text-\|className" || true)

if [ ! -z "$HARDCODED_PASSWORDS" ]; then
    echo -e "${RED}❌ Possíveis senhas hardcoded encontradas:${NC}"
    echo "$HARDCODED_PASSWORDS"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Nenhuma senha hardcoded encontrada${NC}"
fi

# 4. Verificar API keys expostas
echo -e "\n🔍 Procurando API keys expostas..."
API_KEYS=$(grep -r -E "(sk-|pk_|AIza)[A-Za-z0-9]{20,}" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=.next \
    --exclude="*.md" \
    --exclude="check-security.sh" \
    --exclude="package-lock.json" \
    2>/dev/null || true)

if [ ! -z "$API_KEYS" ]; then
    echo -e "${RED}❌ Possíveis API keys encontradas:${NC}"
    echo "$API_KEYS"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Nenhuma API key exposta encontrada${NC}"
fi

# 5. Verificar URLs de banco com credenciais
echo -e "\n🔍 Procurando URLs de banco com credenciais..."
DB_URLS=$(grep -r -E "(postgresql|mysql|mongodb|redis)://[^:]+:[^@\\$\\{\\}]+@" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=.next \
    --exclude="*.md" \
    --exclude="check-security.sh" \
    --exclude="env.example" \
    --exclude="PLUGGY_SETUP.md" \
    --exclude="env.production" \
    --exclude="docker-compose.yml" \
    2>/dev/null | grep -v "\${" || true)

if [ ! -z "$DB_URLS" ]; then
    echo -e "${RED}❌ URLs de banco com credenciais encontradas:${NC}"
    echo "$DB_URLS"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Nenhuma URL de banco com credenciais encontrada${NC}"
fi

# 6. Verificar certificados SSL
echo -e "\n🔍 Procurando certificados SSL..."
CERTIFICATES=$(find . -name "*.pem" -o -name "*.key" -o -name "*.crt" \
    2>/dev/null | grep -v node_modules || true)

if [ ! -z "$CERTIFICATES" ]; then
    echo -e "${YELLOW}⚠️  Certificados SSL encontrados:${NC}"
    echo "$CERTIFICATES"
    echo -e "${YELLOW}   Verifique se devem estar no .gitignore${NC}"
fi

# 7. Verificar tokens JWT hardcoded
echo -e "\n🔍 Procurando tokens JWT..."
JWT_TOKENS=$(grep -r -E "eyJ[A-Za-z0-9_-]{10,}" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=.next \
    --exclude="*.md" \
    --exclude="check-security.sh" \
    2>/dev/null || true)

if [ ! -z "$JWT_TOKENS" ]; then
    echo -e "${RED}❌ Possíveis tokens JWT encontrados:${NC}"
    echo "$JWT_TOKENS"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Nenhum token JWT hardcoded encontrado${NC}"
fi

# 8. Verificar arquivos de backup
echo -e "\n🔍 Procurando arquivos de backup..."
BACKUP_FILES=$(find . -name "*.backup" -o -name "*.bak" -o -name "*.tmp" \
    2>/dev/null | grep -v node_modules || true)

if [ ! -z "$BACKUP_FILES" ]; then
    echo -e "${YELLOW}⚠️  Arquivos de backup encontrados:${NC}"
    echo "$BACKUP_FILES"
    echo -e "${YELLOW}   Considere adicioná-los ao .gitignore${NC}"
fi

# Resultado final
echo -e "\n" 
echo "============================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 SEGURANÇA OK! Nenhum problema crítico encontrado.${NC}"
    echo -e "${GREEN}✅ Seguro para commit.${NC}"
    exit 0
else
    echo -e "${RED}🚨 PROBLEMAS DE SEGURANÇA ENCONTRADOS!${NC}"
    echo -e "${RED}❌ Total de problemas: $ERRORS${NC}"
    echo -e "${RED}🔧 Corrija os problemas antes de fazer commit.${NC}"
    echo ""
    echo -e "${YELLOW}💡 Dicas:${NC}"
    echo "1. Mova dados sensíveis para arquivos .env"
    echo "2. Use variáveis de ambiente: \${VARIABLE}"
    echo "3. Adicione arquivos sensíveis ao .gitignore"
    echo "4. Use senhas aleatórias: openssl rand -base64 32"
    exit 1
fi