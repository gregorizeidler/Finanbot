# 🚀 Guia Completo de Setup - FinanBot com Pluggy

Este guia te ajuda a configurar o FinanBot para usar **Pluggy** ao invés do Open Finance direto, tornando a integração muito mais simples e rápida.

## 📋 Pré-requisitos

- Node.js 16+ 
- PostgreSQL
- Conta Pluggy (gratuita)
- Chave OpenAI

## 🔑 1. Criar Conta Pluggy

### Registro Gratuito
1. Acesse: [https://dashboard.pluggy.ai](https://dashboard.pluggy.ai)
2. Clique em **"Sign Up"**
3. Preencha seus dados
4. Confirme email

### Obter Credenciais
1. No dashboard, vá em **"API Keys"**
2. Anote suas credenciais:
   - `Client ID`
   - `Client Secret`
   - `Webhook Secret` (opcional)

## ⚙️ 2. Configurar Ambiente

### Backend (.env)
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/finanbot?schema=public"

# JWT
JWT_SECRET="sua-chave-jwt-super-secreta-aqui"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="sua-refresh-secret-aqui"
JWT_REFRESH_EXPIRES_IN="30d"

# OpenAI API
OPENAI_API_KEY="sk-sua-chave-openai-aqui"
OPENAI_MODEL="gpt-4-turbo-preview"

# Pluggy API (substitui Open Finance direto)
PLUGGY_BASE_URL="https://api.pluggy.ai"
PLUGGY_CLIENT_ID="seu-pluggy-client-id"
PLUGGY_CLIENT_SECRET="seu-pluggy-client-secret"
PLUGGY_WEBHOOK_SECRET="seu-pluggy-webhook-secret"
PLUGGY_REDIRECT_URI="http://localhost:3000/auth/callback"

# Server Configuration
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL="info"

# Socket.IO
SOCKET_IO_CORS_ORIGIN="http://localhost:3000"
```

## 🗄️ 3. Configurar Banco de Dados

```bash
cd backend/

# Instalar dependências
npm install

# Gerar client Prisma
npm run db:generate

# Executar migrações
npm run db:migrate

# Seed (opcional)
npm run db:seed
```

## 🏦 4. Bancos Suportados pelo Pluggy

O FinanBot agora suporta **200+ bancos brasileiros** via Pluggy:

### Principais Bancos
- **Itaú** (341)
- **Nubank** (260)  
- **Bradesco** (237)
- **Banco do Brasil** (001)
- **Santander** (033)
- **Caixa** (104)
- **XP Banking** (348)
- **BTG Pactual** (208)
- **Sandbox** (600) - Para testes

### Bancos Digitais
- Inter, C6 Bank, Next, PagBank
- PicPay, Mercado Pago, Stone
- 99Pay, Banco Pan, Digio

## 🚀 5. Executar Aplicação

### Backend
```bash
cd backend/
npm run dev
```

### Frontend  
```bash
cd frontend/
npm run dev
```

### URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs

## 🔗 6. Testar Conexão Bancária

### Usando Sandbox (Recomendado)
1. Acesse: http://localhost:3000
2. Clique em **"Conectar Banco"**
3. Escolha **"Sandbox"** para testes
4. Use credenciais fictícias:
   - CPF: `12345678900`
   - Password: `123456`

### Usando Banco Real
1. Escolha seu banco na lista
2. Será redirecionado para Pluggy Connect
3. Faça login com suas credenciais reais
4. Autorize compartilhamento de dados

## 📊 7. APIs Disponíveis

### Listar Bancos
```bash
GET /api/open-finance/banks
```

### Conectar Banco
```bash
POST /api/open-finance/connect
{
  "institutionId": "600"  # ID do banco
}
```

### Sincronizar Contas
```bash
POST /api/open-finance/connections/:id/sync-accounts
```

### Sincronizar Transações
```bash
POST /api/open-finance/accounts/:id/sync-transactions
```

## 🔄 8. Webhooks (Opcional)

Configure webhooks para atualizações automáticas:

### URL do Webhook
```
http://sua-app.com/api/open-finance/webhook
```

### Eventos Suportados
- `item/updated` - Dados atualizados
- `item/error` - Erro na conexão
- `accounts/updated` - Contas atualizadas

## 🐛 9. Troubleshooting

### Erro: "Connection not found"
```bash
# Verificar se conexão existe no banco
psql -d finanbot -c "SELECT * FROM open_finance_connections;"
```

### Erro: "Invalid webhook signature"
```bash
# Verificar PLUGGY_WEBHOOK_SECRET no .env
```

### Erro: "Failed to authenticate with Pluggy"
```bash
# Verificar PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET
```

### Erro: "Popup bloqueado"
- Habilitar popups para localhost:3000
- Ou usar Chrome: `--disable-popup-blocking`

## 💰 10. Custos Pluggy

### Desenvolvimento (Grátis)
- Sandbox ilimitado
- Até 100 transações/mês
- Suporte básico

### Produção
- R$ 0,10 por transação sincronizada
- R$ 50/mês por conexão ativa
- Suporte priority

### vs Open Finance Direto
| Aspecto | Open Finance | Pluggy |
|---------|-------------|--------|
| Setup | 6-12 meses | 1 hora |
| Custo inicial | R$ 50.000+ | Grátis |
| Certificação | Obrigatória | Inclusa |
| Manutenção | Alta | Zero |

## 🎉 11. Próximos Passos

1. **Customize a UI** - Adapte cores e logos
2. **Configure Analytics** - Monitore uso via Pluggy dashboard  
3. **Deploy Produção** - Use Vercel + Railway + Pluggy
4. **Monetize** - Implemente planos pagos
5. **Scale** - Adicione mais funcionalidades IA

## 📞 Suporte

- **Pluggy**: [docs.pluggy.ai](https://docs.pluggy.ai)
- **FinanBot**: Abra issue no GitHub
- **OpenAI**: [platform.openai.com](https://platform.openai.com)

---

## ✅ Checklist Final

- [ ] Conta Pluggy criada
- [ ] Credenciais configuradas no .env
- [ ] Banco de dados rodando
- [ ] Backend rodando (porta 3001)
- [ ] Frontend rodando (porta 3000)
- [ ] Teste com Sandbox funcionando
- [ ] Conexão com banco real testada
- [ ] Chat IA funcionando com dados reais

**🎯 Pronto! Seu FinanBot está rodando com Pluggy!**