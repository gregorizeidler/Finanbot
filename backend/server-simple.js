console.log('🚀 FinanBot Backend iniciando...')

const express = require('express')
const cors = require('cors')
const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: '✅ FinanBot Backend funcionando!',
    timestamp: new Date().toISOString()
  })
})

// Auth routes
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    token: 'demo-token-123',
    user: {
      id: '1',
      email: 'demo@finanbot.com',
      name: 'Usuário Demo'
    }
  })
})

// Dashboard routes  
app.get('/api/dashboard/summary/:userId', (req, res) => {
  res.json({
    income: 5240.50,
    expenses: 3847.20,
    balance: 1393.30,
    topCategories: [
      { name: 'Alimentação', amount: 890.40, percentage: 23 },
      { name: 'Transporte', amount: 567.80, percentage: 15 },
      { name: 'Moradia', amount: 1200.00, percentage: 31 }
    ]
  })
})

// Transactions
app.get('/api/users/:userId/transactions', (req, res) => {
  res.json({
    transactions: [
      {
        id: '1',
        description: 'Supermercado Extra',
        amount: -87.50,
        date: '2024-08-01',
        category: 'Alimentação'
      },
      {
        id: '2', 
        description: 'Salário',
        amount: 5000.00,
        date: '2024-08-01',
        category: 'Receita'
      }
    ]
  })
})

// Chat
app.post('/api/chat/send', (req, res) => {
  const { message } = req.body
  res.json({
    response: `🤖 Analisei sua pergunta: "${message}". Seus gastos estão controlados! Você gastou R$ 3.847,20 este mês e ainda tem R$ 1.393,30 de saldo positivo. Continue assim! 💪`,
    timestamp: new Date().toISOString()
  })
})

app.listen(PORT, () => {
  console.log(`🚀 FinanBot Backend rodando em http://localhost:${PORT}`)
  console.log(`📊 API Health: http://localhost:${PORT}/health`)
  console.log(`✅ Usuário demo: demo@finanbot.com / demo123456`)
})

