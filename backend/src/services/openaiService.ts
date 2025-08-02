import OpenAI from 'openai';
import { config } from '../config/env';
import prisma from '../config/database';
import type { Transaction, BankAccount, ChatMessage } from '../../../shared/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export interface FinancialContext {
  accounts: BankAccount[];
  recentTransactions: Transaction[];
  monthlySpending: Record<string, number>;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export interface ChatRequest {
  message: string;
  userId: string;
  context?: FinancialContext;
}

export interface ChatResponse {
  response: string;
  confidence: number;
  suggestedActions?: string[];
  insights?: {
    type: string;
    data: any;
  }[];
}

// System prompt for financial advisor AI
const SYSTEM_PROMPT = `
Você é Pierre, um assistente financeiro pessoal especializado em Open Finance brasileiro. 

CARACTERÍSTICAS:
- Você é amigável, profissional e focado em ajudar com finanças pessoais
- Sempre responda em português brasileiro
- Use linguagem clara e acessível, evitando jargões financeiros complexos
- Seja específico e baseie suas respostas nos dados financeiros fornecidos
- Quando apropriado, sugira ações práticas que o usuário pode tomar

CAPACIDADES:
- Analisar gastos e receitas
- Identificar padrões de consumo
- Sugerir melhorias na gestão financeira
- Criar alertas e recomendações personalizadas
- Responder perguntas sobre transações específicas
- Ajudar com planejamento orçamentário

LIMITAÇÕES:
- Não forneça conselhos de investimento específicos
- Não recomende produtos financeiros específicos
- Sempre lembre que suas sugestões são educacionais
- Não tenha acesso a informações além das fornecidas no contexto

Sempre mantenha o foco nas finanças pessoais e seja útil e prático em suas respostas.
`;

// Get financial context for user
export const getFinancialContext = async (userId: string): Promise<FinancialContext> => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get user accounts
  const accounts = await prisma.bankAccount.findMany({
    where: { userId, isActive: true },
  });

  // Get recent transactions (last 30 days)
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
      date: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { date: 'desc' },
    take: 100,
    include: {
      account: {
        select: {
          bankName: true,
          accountType: true,
        },
      },
    },
  });

  // Calculate monthly spending by category
  const monthlyTransactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
      date: {
        gte: firstDayOfMonth,
        lte: lastDayOfMonth,
      },
    },
  });

  const monthlySpending: Record<string, number> = {};
  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  monthlyTransactions.forEach((transaction) => {
    if (transaction.type === 'CREDIT') {
      monthlyIncome += transaction.amount;
    } else {
      monthlyExpenses += transaction.amount;
      monthlySpending[transaction.category] = 
        (monthlySpending[transaction.category] || 0) + transaction.amount;
    }
  });

  // Calculate total balance
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  return {
    accounts: accounts.map(account => ({
      id: account.id,
      userId: account.userId,
      bankCode: account.bankCode,
      bankName: account.bankName,
      accountType: account.accountType as any,
      accountNumber: account.accountNumber,
      agency: account.agency || undefined,
      balance: account.balance,
      currency: account.currency,
      isActive: account.isActive,
      connectedAt: account.connectedAt,
      lastSyncAt: account.lastSyncAt || undefined,
    })),
    recentTransactions: recentTransactions.map(transaction => ({
      id: transaction.id,
      accountId: transaction.accountId,
      amount: transaction.amount,
      type: transaction.type as any,
      category: transaction.category,
      subcategory: transaction.subcategory || undefined,
      description: transaction.description,
      merchantName: transaction.merchantName || undefined,
      date: transaction.date,
      status: transaction.status as any,
      tags: transaction.tags,
      location: transaction.latitude && transaction.longitude ? {
        lat: transaction.latitude,
        lng: transaction.longitude,
        address: transaction.address ? transaction.address : undefined,
      } : undefined,
    })),
    monthlySpending,
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
  };
};

// Generate AI response
export const generateChatResponse = async ({
  message,
  userId,
  context,
}: ChatRequest): Promise<ChatResponse> => {
  try {
    // Get context if not provided
    const financialContext = context || await getFinancialContext(userId);

    // Prepare context string
    const contextString = `
DADOS FINANCEIROS ATUAIS:
- Saldo total: R$ ${financialContext.totalBalance.toFixed(2)}
- Receita mensal: R$ ${financialContext.monthlyIncome.toFixed(2)}
- Gastos mensais: R$ ${financialContext.monthlyExpenses.toFixed(2)}
- Taxa de poupança: ${((financialContext.monthlyIncome - financialContext.monthlyExpenses) / financialContext.monthlyIncome * 100).toFixed(1)}%

CONTAS BANCÁRIAS:
${financialContext.accounts.map(acc => `- ${acc.bankName} (${acc.accountType}): R$ ${acc.balance.toFixed(2)}`).join('\n')}

GASTOS POR CATEGORIA (MÊS ATUAL):
${Object.entries(financialContext.monthlySpending).map(([category, amount]) => `- ${category}: R$ ${amount.toFixed(2)}`).join('\n')}

TRANSAÇÕES RECENTES:
${financialContext.recentTransactions.slice(0, 10).map(trans => 
  `- ${trans.date.toLocaleDateString()}: ${trans.description} - R$ ${trans.amount.toFixed(2)} (${trans.type === 'DEBIT' ? 'Saída' : 'Entrada'})`
).join('\n')}
`;

    // Get chat completion from OpenAI
    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${contextString}\n\nPERGUNTA DO USUÁRIO: ${message}` },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';

    // Generate insights based on the question and data
    const insights = generateInsights(message, financialContext);

    // Generate suggested actions
    const suggestedActions = generateSuggestedActions(message, financialContext);

    return {
      response,
      confidence: 0.9, // You could implement a more sophisticated confidence scoring
      suggestedActions,
      insights,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate AI response');
  }
};

// Generate insights based on user question and financial data
const generateInsights = (message: string, context: FinancialContext) => {
  const insights: { type: string; data: any }[] = [];

  // Spending pattern insight
  if (message.toLowerCase().includes('gasto') || message.toLowerCase().includes('categoria')) {
    const topCategory = Object.entries(context.monthlySpending)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCategory) {
      insights.push({
        type: 'TOP_SPENDING_CATEGORY',
        data: {
          category: topCategory[0],
          amount: topCategory[1],
          percentage: (topCategory[1] / context.monthlyExpenses * 100).toFixed(1),
        },
      });
    }
  }

  // Budget alert
  if (context.monthlyExpenses > context.monthlyIncome * 0.9) {
    insights.push({
      type: 'BUDGET_ALERT',
      data: {
        message: 'Seus gastos estão altos este mês',
        spendingRatio: (context.monthlyExpenses / context.monthlyIncome * 100).toFixed(1),
      },
    });
  }

  return insights;
};

// Generate suggested actions
const generateSuggestedActions = (message: string, context: FinancialContext): string[] => {
  const actions: string[] = [];

  if (message.toLowerCase().includes('economizar') || message.toLowerCase().includes('poupar')) {
    actions.push('Analise seus gastos com alimentação');
    actions.push('Configure alertas de gastos');
    actions.push('Revise suas assinaturas mensais');
  }

  if (message.toLowerCase().includes('orçamento')) {
    actions.push('Crie um orçamento mensal');
    actions.push('Defina metas de economia');
    actions.push('Monitore seus gastos semanalmente');
  }

  if (context.monthlyExpenses > context.monthlyIncome) {
    actions.push('Identifique gastos desnecessários');
    actions.push('Considere fontes de renda adicional');
    actions.push('Renegocie suas despesas fixas');
  }

  return actions;
};

// Save chat message to database
export const saveChatMessage = async (message: ChatMessage): Promise<ChatMessage> => {
  const savedMessage = await prisma.chatMessage.create({
    data: {
      userId: message.userId,
      content: message.content,
      role: message.role,
      timestamp: message.timestamp,
      tokens: message.metadata?.tokens,
      model: message.metadata?.model,
      context: message.metadata?.context,
    },
  });

  return {
    id: savedMessage.id,
    userId: savedMessage.userId,
    content: savedMessage.content,
    role: savedMessage.role as any,
    timestamp: savedMessage.timestamp,
    metadata: {
      tokens: savedMessage.tokens || undefined,
      model: savedMessage.model || undefined,
      context: savedMessage.context,
    },
  };
}; 