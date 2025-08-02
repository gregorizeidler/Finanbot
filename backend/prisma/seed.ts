import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create sample user
  const hashedPassword = await bcrypt.hash('demo123456', 12)
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@finanbot.com' },
    update: {},
    create: {
      name: 'Usuário Demo',
      email: 'demo@finanbot.com',
      password: hashedPassword,
    },
  })

  console.log('👤 Created demo user:', user.email)

  // Create bank institutions
  const banks = [
    { id: 'itau', name: 'Itaú', code: '341', logo: '/banks/itau.png', color: '#FF6B00' },
    { id: 'bradesco', name: 'Bradesco', code: '237', logo: '/banks/bradesco.png', color: '#E30613' },
    { id: 'bb', name: 'Banco do Brasil', code: '001', logo: '/banks/bb.png', color: '#FFDE00' },
    { id: 'nubank', name: 'Nubank', code: '260', logo: '/banks/nubank.png', color: '#8A05BE' },
    { id: 'santander', name: 'Santander', code: '033', logo: '/banks/santander.png', color: '#EC0000' },
    { id: 'caixa', name: 'Caixa Econômica Federal', code: '104', logo: '/banks/caixa.png', color: '#0066B3' },
    { id: 'xp', name: 'XP Banking', code: '348', logo: '/banks/xp.png', color: '#000000' },
    { id: 'btg', name: 'BTG Pactual', code: '208', logo: '/banks/btg.png', color: '#1B1B1B' },
  ]

  for (const bank of banks) {
    await prisma.bankInstitution.upsert({
      where: { code: bank.code },
      update: bank,
      create: bank,
    })
  }

  console.log('🏦 Created bank institutions')

  // Create sample bank accounts
  const account1 = await prisma.bankAccount.create({
    data: {
      userId: user.id,
      bankCode: '341',
      bankName: 'Itaú',
      accountType: 'CHECKING',
      accountNumber: '12345-6',
      agency: '1234',
      balance: 5250.75,
      currency: 'BRL',
      isActive: true,
      connectedAt: new Date(),
      lastSyncAt: new Date(),
    },
  })

  const account2 = await prisma.bankAccount.create({
    data: {
      userId: user.id,
      bankCode: '260',
      bankName: 'Nubank',
      accountType: 'CREDIT_CARD',
      accountNumber: '**** 1234',
      balance: -1200.50,
      currency: 'BRL',
      isActive: true,
      connectedAt: new Date(),
      lastSyncAt: new Date(),
    },
  })

  console.log('💳 Created sample accounts')

  // Create sample transactions
  const transactions = [
    {
      accountId: account1.id,
      amount: 3500.00,
      type: 'CREDIT' as const,
      category: 'Receita',
      description: 'Salário mensal',
      date: new Date(2024, 11, 1), // December 1, 2024
      status: 'COMPLETED' as const,
    },
    {
      accountId: account1.id,
      amount: 89.90,
      type: 'DEBIT' as const,
      category: 'Alimentação',
      description: 'Supermercado Extra',
      merchantName: 'Extra Supermercados',
      date: new Date(2024, 11, 2),
      status: 'COMPLETED' as const,
    },
    {
      accountId: account1.id,
      amount: 45.00,
      type: 'DEBIT' as const,
      category: 'Transporte',
      description: 'Combustível posto Shell',
      merchantName: 'Shell',
      date: new Date(2024, 11, 3),
      status: 'COMPLETED' as const,
    },
    {
      accountId: account2.id,
      amount: 320.00,
      type: 'DEBIT' as const,
      category: 'Alimentação',
      description: 'Restaurante Japonês',
      merchantName: 'Sushi House',
      date: new Date(2024, 11, 15),
      status: 'COMPLETED' as const,
    },
    {
      accountId: account2.id,
      amount: 29.90,
      type: 'DEBIT' as const,
      category: 'Entretenimento',
      description: 'Netflix',
      merchantName: 'Netflix',
      date: new Date(2024, 11, 10),
      status: 'COMPLETED' as const,
    },
    {
      accountId: account1.id,
      amount: 1200.00,
      type: 'DEBIT' as const,
      category: 'Habitação',
      description: 'Aluguel apartamento',
      date: new Date(2024, 11, 5),
      status: 'COMPLETED' as const,
    },
  ]

  for (const transaction of transactions) {
    await prisma.transaction.create({
      data: {
        ...transaction,
        tags: [],
      },
    })
  }

  console.log('📊 Created sample transactions')

  // Create sample financial insights
  const insights = [
    {
      userId: user.id,
      type: 'EXPENSE_ANALYSIS' as const,
      title: 'Gastos com alimentação aumentaram',
      description: 'Seus gastos com alimentação aumentaram 25% em relação ao mês passado. Considere revisar seus hábitos alimentares.',
      data: { category: 'Alimentação', increase: 25, amount: 1250 },
      priority: 'MEDIUM' as const,
      isRead: false,
    },
    {
      userId: user.id,
      type: 'BUDGET_ALERT' as const,
      title: 'Meta de gastos atingida',
      description: 'Você atingiu 80% da sua meta de gastos mensal. Fique atento aos próximos gastos.',
      data: { percentage: 80, category: 'Total' },
      priority: 'HIGH' as const,
      isRead: false,
    },
    {
      userId: user.id,
      type: 'RECOMMENDATION' as const,
      title: 'Oportunidade de economia',
      description: 'Você pode economizar R$ 150/mês cancelando assinaturas não utilizadas.',
      data: { savings: 150, suggestions: ['Netflix duplicado', 'Spotify Premium'] },
      priority: 'LOW' as const,
      isRead: false,
    },
  ]

  for (const insight of insights) {
    await prisma.financialInsight.create({
      data: insight,
    })
  }

  console.log('💡 Created sample insights')

  // Create sample chat messages
  const chatMessages = [
    {
      userId: user.id,
      content: 'Olá! Como estão minhas finanças este mês?',
      role: 'user' as const,
      timestamp: new Date(2024, 11, 20, 10, 30),
    },
    {
      userId: user.id,
      content: 'Olá! Suas finanças estão bem organizadas este mês. Você teve uma receita de R$ 3.500 e gastos de R$ 1.705,30, resultando em uma economia de R$ 1.794,70 (51,3%). Seu maior gasto foi com habitação (R$ 1.200), seguido por alimentação (R$ 409,90). Continue assim!',
      role: 'assistant' as const,
      timestamp: new Date(2024, 11, 20, 10, 31),
      model: 'gpt-4-turbo-preview',
    },
    {
      userId: user.id,
      content: 'Qual foi meu maior gasto com alimentação?',
      role: 'user' as const,
      timestamp: new Date(2024, 11, 20, 14, 20),
    },
    {
      userId: user.id,
      content: 'Seu maior gasto com alimentação foi R$ 320 em um restaurante japonês no dia 15. No total, você gastou R$ 409,90 com alimentação este mês, divididos entre supermercado (R$ 89,90) e restaurantes (R$ 320).',
      role: 'assistant' as const,
      timestamp: new Date(2024, 11, 20, 14, 20),
      model: 'gpt-4-turbo-preview',
    },
  ]

  for (const message of chatMessages) {
    await prisma.chatMessage.create({
      data: message,
    })
  }

  console.log('💬 Created sample chat messages')

  console.log('✅ Database seed completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error during seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  }) 