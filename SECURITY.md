# 🔒 Guia de Segurança - FinanBot

## ⚠️ DADOS SENSÍVEIS QUE NÃO DEVEM SER COMMITADOS

### 1. **Arquivos de Ambiente**
```bash
# ❌ NUNCA commite estes arquivos:
.env
.env.local
.env.production
.env.staging
backend/.env
frontend/.env
mcp-server/.env
```

### 2. **Chaves e Secrets**
```bash
# ❌ Exemplos de dados que vazam:
JWT_SECRET=abc123...
OPENAI_API_KEY=sk-...
POSTGRES_PASSWORD=finanbot123
REDIS_PASSWORD=redis123
OPEN_FINANCE_CLIENT_SECRET=secret123
```

### 3. **URLs de Banco com Credenciais**
```bash
# ❌ NUNCA hardcode credenciais:
postgresql://user:password@host:5432/db
redis://:password@host:6379
```

## 🛡️ COMO O GITGUARDIAN DETECTA

O GitGuardian procura por **padrões conhecidos**:

- **Senhas**: `password`, `pwd`, strings simples
- **API Keys**: `sk-`, `pk_`, padrões de chaves
- **JWT**: Tokens longos em base64
- **Database URLs**: `postgresql://`, `mysql://`, `mongodb://`
- **Certificates**: `-----BEGIN`, `.pem`, `.key`

## ✅ COMO PROTEGER O PROJETO

### 1. **Use Variáveis de Ambiente**
```bash
# ✅ Em vez de:
JWT_SECRET="minha-chave-123"

# ✅ Use:
JWT_SECRET=${JWT_SECRET:?Erro: JWT_SECRET não definida}
```

### 2. **Gere Senhas Seguras**
```bash
# ✅ Gere senhas aleatórias:
openssl rand -base64 32
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. **Configure .env Localmente**
```bash
# backend/.env (NÃO commitar)
DATABASE_URL="postgresql://finanbot:SENHA_FORTE_AQUI@localhost:5432/finanbot"
JWT_SECRET="jwt-secret-256-bits-super-seguro"
OPENAI_API_KEY="sk-sua-chave-real-aqui"
```

### 4. **Use env.example para Documentação**
```bash
# ✅ env.example (pode commitar)
DATABASE_URL="postgresql://username:password@localhost:5432/finanbot"
JWT_SECRET="your-super-secret-jwt-key-here"
OPENAI_API_KEY="sk-your-openai-api-key-here"
```

## 🚨 CHECKLIST ANTES DE FAZER PUSH

- [ ] Arquivos `.env` estão no `.gitignore`?
- [ ] Nenhuma senha hardcoded no código?
- [ ] Todas as variáveis usam `${VAR}` em vez de valores fixos?
- [ ] Senhas de produção são diferentes de dev?
- [ ] Certificados SSL não estão no repo?

## 🔧 COMANDOS DE VERIFICAÇÃO

### Verificar se há segredos:
```bash
# Procurar possíveis vazamentos:
grep -r "password\|secret\|key" . --exclude-dir=node_modules --exclude="*.md"
grep -r "sk-\|pk_" . --exclude-dir=node_modules
grep -r "postgresql://.*:.*@" . --exclude-dir=node_modules
```

### Limpar histórico se vazou:
```bash
# Se já commitou dados sensíveis:
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch arquivo-com-secrets' \
--prune-empty --tag-name-filter cat -- --all

# Forçar push:
git push origin --force --all
```

## 📋 CONFIGURAÇÃO SEGURA DE PRODUÇÃO

### 1. **Variáveis de Ambiente do Server**
```bash
export DATABASE_URL="postgresql://finanbot:$(openssl rand -base64 32)@localhost:5432/finanbot"
export JWT_SECRET="$(openssl rand -base64 32)"
export OPENAI_API_KEY="sk-sua-chave-real"
export REDIS_PASSWORD="$(openssl rand -base64 24)"
export POSTGRES_PASSWORD="$(openssl rand -base64 24)"
```

### 2. **Docker Secrets (Recomendado)**
```yaml
# docker-compose.yml
services:
  backend:
    secrets:
      - jwt_secret
      - openai_key
      - postgres_password

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  openai_key:
    file: ./secrets/openai_key.txt
  postgres_password:
    file: ./secrets/postgres_password.txt
```

## 🎯 FERRAMENTAS RECOMENDADAS

1. **GitGuardian** - Detecção automática de segredos
2. **git-secrets** - Previne commits com dados sensíveis
3. **Trivy** - Scanner de vulnerabilidades
4. **SOPS** - Criptografia de arquivos de configuração

## 📞 CONTATO PARA EMERGÊNCIAS

Se você acidentalmente commitou dados sensíveis:

1. **Revogue IMEDIATAMENTE** todas as chaves expostas
2. **Gere novas credenciais**
3. **Limpe o histórico do Git**
4. **Notifique a equipe de segurança**

---

**⚠️ Lembre-se: Uma vez na internet, sempre na internet. Prevenção é melhor que correção!**