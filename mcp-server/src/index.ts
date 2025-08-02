#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import 'dotenv/config';

// Configuração da API do FinanBot
const API_BASE_URL = process.env.FINANBOT_API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.FINANBOT_API_KEY || 'demo-key';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  accountId: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  institution: string;
}

interface FinancialInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  createdAt: string;
}

// Criar instância do servidor MCP
const server = new Server(
  {
    name: 'finanbot-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Função auxiliar para fazer requisições à API
async function apiRequest(endpoint: string, options: any = {}) {
  try {
    const response = await axios({
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    return response.data;
  } catch (error: any) {
    console.error(`Erro na API: ${error.message}`);
    throw new McpError(
      ErrorCode.InternalError,
      `Erro ao conectar com FinanBot API: ${error.message}`
    );
  }
}

// Listar ferramentas disponíveis
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_transactions',
        description: 'Buscar transações financeiras do usuário',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'ID do usuário',
            },
            startDate: {
              type: 'string',
              description: 'Data de início (YYYY-MM-DD)',
            },
            endDate: {
              type: 'string',
              description: 'Data de fim (YYYY-MM-DD)',
            },
            category: {
              type: 'string',
              description: 'Categoria específica (opcional)',
            },
            limit: {
              type: 'number',
              description: 'Limite de resultados (padrão: 50)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'get_accounts',
        description: 'Buscar contas bancárias conectadas do usuário',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'ID do usuário',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'get_financial_summary',
        description: 'Obter resumo financeiro completo do usuário',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'ID do usuário',
            },
            period: {
              type: 'string',
              enum: ['week', 'month', 'quarter', 'year'],
              description: 'Período para análise (padrão: month)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'get_spending_analysis',
        description: 'Análise detalhada de gastos por categoria',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'ID do usuário',
            },
            period: {
              type: 'string',
              enum: ['week', 'month', 'quarter', 'year'],
              description: 'Período para análise',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'get_financial_insights',
        description: 'Buscar insights financeiros gerados pela IA',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'ID do usuário',
            },
            type: {
              type: 'string',
              enum: ['spending', 'saving', 'investment', 'budget'],
              description: 'Tipo de insight (opcional)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'create_budget_suggestion',
        description: 'Criar sugestão de orçamento baseada no histórico',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'ID do usuário',
            },
            targetAmount: {
              type: 'number',
              description: 'Valor alvo para o orçamento',
            },
            category: {
              type: 'string',
              description: 'Categoria específica (opcional)',
            },
          },
          required: ['userId'],
        },
      },
    ],
  };
});

// Implementar execução das ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_transactions': {
        const { userId, startDate, endDate, category, limit = 50 } = args as any;
        
        const queryParams = new URLSearchParams({
          limit: limit.toString(),
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
          ...(category && { category }),
        });

        const data = await apiRequest(`/users/${userId}/transactions?${queryParams}`);
        
        return {
          content: [
            {
              type: 'text',
              text: `📊 **Transações Encontradas**: ${data.transactions?.length || 0}

${data.transactions?.map((t: Transaction) => 
  `• **${t.description}** - R$ ${t.amount.toFixed(2)} (${t.category}) - ${new Date(t.date).toLocaleDateString('pt-BR')}`
).join('\n') || 'Nenhuma transação encontrada.'}

**Total**: R$ ${data.summary?.total?.toFixed(2) || '0.00'}`,
            },
          ],
        };
      }

      case 'get_accounts': {
        const { userId } = args as any;
        const data = await apiRequest(`/users/${userId}/accounts`);
        
        return {
          content: [
            {
              type: 'text',
              text: `🏦 **Contas Bancárias Conectadas**: ${data.accounts?.length || 0}

${data.accounts?.map((acc: Account) => 
  `• **${acc.name}** (${acc.institution})
  Tipo: ${acc.type}
  Saldo: R$ ${acc.balance.toFixed(2)}`
).join('\n\n') || 'Nenhuma conta conectada.'}

**Saldo Total**: R$ ${data.totalBalance?.toFixed(2) || '0.00'}`,
            },
          ],
        };
      }

      case 'get_financial_summary': {
        const { userId, period = 'month' } = args as any;
        const data = await apiRequest(`/dashboard/summary/${userId}?period=${period}`);
        
        return {
          content: [
            {
              type: 'text',
              text: `📈 **Resumo Financeiro** (${period})

**💰 Receitas**: R$ ${data.income?.toFixed(2) || '0.00'}
**💸 Gastos**: R$ ${data.expenses?.toFixed(2) || '0.00'}
**💵 Saldo**: R$ ${data.balance?.toFixed(2) || '0.00'}

**📊 Top Categorias de Gasto:**
${data.topCategories?.map((cat: any) => 
  `• ${cat.name}: R$ ${cat.amount.toFixed(2)} (${cat.percentage}%)`
).join('\n') || 'Sem dados'}

**🎯 Status**: ${data.balance >= 0 ? '✅ Positivo' : '❌ Negativo'}`,
            },
          ],
        };
      }

      case 'get_spending_analysis': {
        const { userId, period } = args as any;
        const data = await apiRequest(`/dashboard/expenses/${userId}?period=${period}`);
        
        return {
          content: [
            {
              type: 'text',
              text: `🔍 **Análise de Gastos** (${period})

**💸 Total Gasto**: R$ ${data.totalExpenses?.toFixed(2) || '0.00'}

**📊 Por Categoria:**
${data.categories?.map((cat: any) => 
  `• **${cat.name}**: R$ ${cat.amount.toFixed(2)} (${cat.percentage}%)
  ${cat.trend === 'up' ? '📈' : cat.trend === 'down' ? '📉' : '➡️'} ${cat.variation || 'Sem variação'}`
).join('\n') || 'Sem dados'}

**📈 Tendência Geral**: ${data.overallTrend || 'Estável'}`,
            },
          ],
        };
      }

      case 'get_financial_insights': {
        const { userId, type } = args as any;
        const queryParams = type ? `?type=${type}` : '';
        const data = await apiRequest(`/dashboard/insights/${userId}${queryParams}`);
        
        return {
          content: [
            {
              type: 'text',
              text: `💡 **Insights Financeiros** ${type ? `(${type})` : ''}

${data.insights?.map((insight: FinancialInsight) => 
  `${insight.impact === 'positive' ? '✅' : insight.impact === 'negative' ? '⚠️' : 'ℹ️'} **${insight.title}**
${insight.description}
_${new Date(insight.createdAt).toLocaleDateString('pt-BR')}_`
).join('\n\n') || 'Nenhum insight disponível.'}`,
            },
          ],
        };
      }

      case 'create_budget_suggestion': {
        const { userId, targetAmount, category } = args as any;
        const data = await apiRequest('/budget/suggest', {
          method: 'POST',
          data: { userId, targetAmount, category },
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `💰 **Sugestão de Orçamento**

**Meta**: R$ ${targetAmount.toFixed(2)} ${category ? `para ${category}` : ''}

**📋 Recomendações:**
${data.suggestions?.map((s: any) => 
  `• ${s.description} - Economia potencial: R$ ${s.savings?.toFixed(2) || '0.00'}`
).join('\n') || 'Sem sugestões específicas.'}

**🎯 Viabilidade**: ${data.feasibility || 'Moderada'}
**⏱️ Prazo Estimado**: ${data.timeline || 'Não informado'}`,
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Ferramenta desconhecida: ${name}`
        );
    }
  } catch (error: any) {
    console.error(`Erro ao executar ${name}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Erro ao executar ${name}: ${error.message}`
    );
  }
});

// Iniciar servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FinanBot MCP Server rodando! 🚀');
}

main().catch((error) => {
  console.error('Erro ao iniciar servidor MCP:', error);
  process.exit(1);
});