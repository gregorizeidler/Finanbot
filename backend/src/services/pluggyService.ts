import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import prisma from '../config/database';
import type { BankAccount, Transaction } from '../../../shared/types';
import crypto from 'crypto';

export interface PluggyAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface PluggyItemResponse {
  id: string;
  connector: {
    id: number;
    name: string;
    institutionUrl: string;
    country: string;
    type: string;
    primaryColor: string;
    imageUrl: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  lastUpdatedAt?: string;
  webhook?: string;
  consecutiveFailedUpdates: number;
}

export interface PluggyAccount {
  id: string;
  type: string;
  subtype: string;
  number: string;
  name: string;
  balance: number;
  currencyCode: string;
  itemId: string;
  bankData?: {
    transferNumber?: string;
    closingBalance?: number;
  };
  creditData?: {
    availableCreditLimit?: number;
    creditLimit?: number;
    cuttingDate?: string;
    dueDate?: string;
  };
}

export interface PluggyTransaction {
  id: string;
  accountId: string;
  amount: number;
  currencyCode: string;
  date: string;
  description: string;
  type?: string;
  category?: string;
  merchant?: {
    name?: string;
    businessName?: string;
    cnpj?: string;
  };
  paymentData?: {
    payer?: {
      documentNumber?: {
        type: string;
        value: string;
      };
    };
    receiver?: {
      documentNumber?: {
        type: string;
        value: string;
      };
    };
  };
}

// Bancos brasileiros suportados pelo Pluggy
export const PLUGGY_BANKS = [
  { id: '201', name: 'Itaú', code: '341', logo: '/banks/itau.png', color: '#FF6B00' },
  { id: '212', name: 'Bradesco', code: '237', logo: '/banks/bradesco.png', color: '#E30613' },
  { id: '208', name: 'Banco do Brasil', code: '001', logo: '/banks/bb.png', color: '#FFDE00' },
  { id: '280', name: 'Nubank', code: '260', logo: '/banks/nubank.png', color: '#8A05BE' },
  { id: '202', name: 'Santander', code: '033', logo: '/banks/santander.png', color: '#EC0000' },
  { id: '207', name: 'Caixa Econômica Federal', code: '104', logo: '/banks/caixa.png', color: '#0066B3' },
  { id: '239', name: 'XP Banking', code: '348', logo: '/banks/xp.png', color: '#000000' },
  { id: '213', name: 'BTG Pactual', code: '208', logo: '/banks/btg.png', color: '#1B1B1B' },
  { id: '600', name: 'Sandbox', code: '600', logo: '/banks/sandbox.png', color: '#48be9d' }, // Para testes
];

class PluggyService {
  private apiClient: AxiosInstance;
  private baseURL: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.baseURL = config.pluggy.baseUrl;
    this.clientId = config.pluggy.clientId;
    this.clientSecret = config.pluggy.clientSecret;

    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token automaticamente
    this.apiClient.interceptors.request.use(async (config) => {
      const token = await this.getAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  // Obter token de acesso
  private async getAccessToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseURL}/auth`,
        {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
        }
      );

      return response.data.apiKey;
    } catch (error) {
      console.error('Pluggy auth error:', error);
      throw new Error('Failed to authenticate with Pluggy');
    }
  }

  // Obter URL de autorização para conectar banco
  async getAuthorizationUrl(institutionId: string, userId: string): Promise<string> {
    try {
      // Cria item no Pluggy
      const itemResponse = await this.apiClient.post('/items', {
        connectorId: parseInt(institutionId),
        parameters: {}, // Parâmetros serão preenchidos no widget
      });

      const item: PluggyItemResponse = itemResponse.data;

      // Salva conexão no banco de dados
      await prisma.openFinanceConnection.create({
        data: {
          userId,
          institutionId,
          institutionName: item.connector.name,
          consentId: item.id,
          accessToken: item.id, // No Pluggy, usamos o item.id como identificador
          refreshToken: '',
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 meses
          permissions: ['ACCOUNTS_READ', 'TRANSACTIONS_READ', 'IDENTITY_READ'],
          status: 'ACTIVE',
        },
      });

      // Retorna URL do Pluggy Connect Widget
      return `https://connect.pluggy.ai?connectorId=${institutionId}&itemId=${item.id}&clientName=FinanBot`;
    } catch (error) {
      console.error('Pluggy create item error:', error);
      throw new Error('Failed to initiate bank connection with Pluggy');
    }
  }

  // Trocar código por tokens (não aplicável no Pluggy, mas mantemos para compatibilidade)
  async exchangeCodeForToken(code: string, consentId: string): Promise<{ success: boolean }> {
    try {
      // No Pluggy, a conexão já é estabelecida via widget
      // Apenas atualizamos o status da conexão
      const connection = await prisma.openFinanceConnection.findFirst({
        where: { consentId }
      });

      if (!connection) {
        throw new Error('Connection not found');
      }

      await prisma.openFinanceConnection.update({
        where: { id: connection.id },
        data: {
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Pluggy token exchange error:', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  // Buscar contas do Pluggy
  async getAccounts(connectionId: string): Promise<BankAccount[]> {
    const connection = await prisma.openFinanceConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.status !== 'ACTIVE') {
      throw new Error('Invalid or inactive connection');
    }

    try {
      // Busca contas no Pluggy usando item ID
      const response = await this.apiClient.get(`/accounts?itemId=${connection.consentId}`);
      const accounts: PluggyAccount[] = response.data.results || response.data;
      const bankAccounts: BankAccount[] = [];

      for (const account of accounts) {
        // Busca conta existente ou cria nova
        let savedAccount = await prisma.bankAccount.findFirst({
          where: {
            userId: connection.userId,
            accountNumber: account.number,
          }
        });

        if (savedAccount) {
          // Atualiza conta existente
          savedAccount = await prisma.bankAccount.update({
            where: { id: savedAccount.id },
            data: {
              balance: account.balance,
              lastSyncAt: new Date(),
            },
          });
        } else {
          // Cria nova conta
          savedAccount = await prisma.bankAccount.create({
            data: {
              userId: connection.userId,
              bankCode: PLUGGY_BANKS.find(b => b.id === connection.institutionId)?.code || '000',
              bankName: connection.institutionName,
              accountType: this.mapAccountType(account.type),
              accountNumber: account.number,
              agency: account.bankData?.transferNumber?.slice(0, 4) || '0000',
              balance: account.balance,
              currency: account.currencyCode,
              isActive: true,
              connectedAt: new Date(),
              lastSyncAt: new Date(),
            },
          });
        }

        bankAccounts.push({
          id: savedAccount.id,
          userId: savedAccount.userId,
          bankCode: savedAccount.bankCode,
          bankName: savedAccount.bankName,
          accountType: savedAccount.accountType as any,
          accountNumber: savedAccount.accountNumber,
          agency: savedAccount.agency || undefined,
          balance: savedAccount.balance,
          currency: savedAccount.currency,
          isActive: savedAccount.isActive,
          connectedAt: savedAccount.connectedAt,
          lastSyncAt: savedAccount.lastSyncAt || undefined,
        });
      }

      return bankAccounts;
    } catch (error) {
      console.error('Pluggy get accounts error:', error);
      throw new Error('Failed to fetch accounts from Pluggy');
    }
  }

  // Buscar transações do Pluggy
  async getTransactions(accountId: string, fromDate?: Date, toDate?: Date): Promise<Transaction[]> {
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
      include: {
        user: {
          include: {
            connections: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    if (!account || !account.user.connections.length) {
      throw new Error('Account not found or no active connections');
    }

    const connection = account.user.connections[0];
    const from = fromDate?.toISOString().split('T')[0] || 
                 new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = toDate?.toISOString().split('T')[0] || 
               new Date().toISOString().split('T')[0];

    try {
      // Busca transações no Pluggy
      const response = await this.apiClient.get('/transactions', {
        params: {
          accountId: account.accountNumber,
          from,
          to,
        },
      });

      const transactions: PluggyTransaction[] = response.data.results || response.data;
      const mappedTransactions: Transaction[] = [];

      for (const transaction of transactions) {
        // Salva ou atualiza transação no banco
        const savedTransaction = await prisma.transaction.upsert({
          where: { id: transaction.id },
          update: {
            amount: Math.abs(transaction.amount),
            status: 'COMPLETED',
          },
          create: {
            id: transaction.id,
            accountId: account.id,
            amount: Math.abs(transaction.amount),
            type: transaction.amount < 0 ? 'DEBIT' : 'CREDIT',
            category: transaction.category || this.categorizeTransaction(transaction.description),
            description: transaction.description,
            merchantName: transaction.merchant?.name || transaction.merchant?.businessName,
            date: new Date(transaction.date),
            status: 'COMPLETED',
            tags: [],
          },
        });

        mappedTransactions.push({
          id: savedTransaction.id,
          accountId: savedTransaction.accountId,
          amount: savedTransaction.amount,
          type: savedTransaction.type as any,
          category: savedTransaction.category,
          subcategory: savedTransaction.subcategory || undefined,
          description: savedTransaction.description,
          merchantName: savedTransaction.merchantName || undefined,
          date: savedTransaction.date,
          status: savedTransaction.status as any,
          tags: savedTransaction.tags,
          location: savedTransaction.latitude && savedTransaction.longitude ? {
            lat: savedTransaction.latitude,
            lng: savedTransaction.longitude,
            address: savedTransaction.address || undefined,
          } : undefined,
        });
      }

      // Atualiza última sincronização
      await prisma.bankAccount.update({
        where: { id: accountId },
        data: { lastSyncAt: new Date() },
      });

      return mappedTransactions;
    } catch (error) {
      console.error('Pluggy get transactions error:', error);
      throw new Error('Failed to fetch transactions from Pluggy');
    }
  }

  // Atualizar tokens (no Pluggy isso é automático)
  async refreshAccessToken(connectionId: string): Promise<void> {
    const connection = await prisma.openFinanceConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    try {
      // No Pluggy, verificamos se o item ainda está ativo
      const response = await this.apiClient.get(`/items/${connection.consentId}`);
      const item: PluggyItemResponse = response.data;

      if (item.status === 'LOGIN_ERROR' || item.status === 'OUTDATED') {
        // Marca conexão como expirada se houver erro
        await prisma.openFinanceConnection.update({
          where: { id: connectionId },
          data: { status: 'EXPIRED' },
        });
        throw new Error('Item requires user re-authentication');
      }

      // Atualiza data de atualização
      await prisma.openFinanceConnection.update({
        where: { id: connectionId },
        data: { updatedAt: new Date() },
      });
    } catch (error) {
      console.error('Pluggy refresh token error:', error);
      
      // Marca conexão como expirada
      await prisma.openFinanceConnection.update({
        where: { id: connectionId },
        data: { status: 'EXPIRED' },
      });
      
      throw new Error('Failed to refresh Pluggy connection');
    }
  }

  // Mapear tipo de conta do Pluggy para nosso enum
  private mapAccountType(type: string): 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' {
    switch (type.toUpperCase()) {
      case 'BANK':
      case 'CHECKING':
        return 'CHECKING';
      case 'SAVINGS':
        return 'SAVINGS';
      case 'CREDIT':
      case 'CREDIT_CARD':
        return 'CREDIT_CARD';
      case 'INVESTMENT':
        return 'INVESTMENT';
      default:
        return 'CHECKING';
    }
  }

  // Categorização inteligente de transações
  private categorizeTransaction(description: string): string {
    const desc = description.toLowerCase();
    
    // PIX e transferências
    if (desc.includes('pix') || desc.includes('ted') || desc.includes('doc') || desc.includes('transferencia')) {
      return 'Transferências';
    }
    
    // Alimentação
    if (desc.includes('supermercado') || desc.includes('mercado') || desc.includes('alimentacao') || 
        desc.includes('restaurante') || desc.includes('lanchonete') || desc.includes('padaria') ||
        desc.includes('ifood') || desc.includes('uber eats') || desc.includes('delivery')) {
      return 'Alimentação';
    }
    
    // Transporte
    if (desc.includes('combustivel') || desc.includes('posto') || desc.includes('gasolina') ||
        desc.includes('uber') || desc.includes('99') || desc.includes('onibus') || 
        desc.includes('metro') || desc.includes('estacionamento')) {
      return 'Transporte';
    }
    
    // Saúde
    if (desc.includes('farmacia') || desc.includes('medic') || desc.includes('hospital') ||
        desc.includes('clinica') || desc.includes('consulta') || desc.includes('exame')) {
      return 'Saúde';
    }
    
    // Entretenimento
    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('cinema') ||
        desc.includes('show') || desc.includes('teatro') || desc.includes('streaming')) {
      return 'Entretenimento';
    }
    
    // Habitação
    if (desc.includes('aluguel') || desc.includes('financiamento') || desc.includes('condominio') ||
        desc.includes('iptu') || desc.includes('energia') || desc.includes('agua') || desc.includes('gas')) {
      return 'Habitação';
    }
    
    // Receita
    if (desc.includes('salario') || desc.includes('rendimento') || desc.includes('deposito') ||
        desc.includes('pix recebido') || desc.includes('ted recebida')) {
      return 'Receita';
    }
    
    // Educação
    if (desc.includes('escola') || desc.includes('universidade') || desc.includes('curso') ||
        desc.includes('livro') || desc.includes('material escolar')) {
      return 'Educação';
    }
    
    return 'Outros';
  }

  // Webhook para atualização automática (opcional)
  async handleWebhook(payload: any, signature: string): Promise<void> {
    try {
      // Verificar assinatura do webhook
      const expectedSignature = crypto
        .createHmac('sha256', config.pluggy.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }

      // Processar evento do webhook
      if (payload.event === 'item/updated') {
        const itemId = payload.data.id;
        
        // Atualizar dados automaticamente
        const connection = await prisma.openFinanceConnection.findFirst({
          where: { consentId: itemId }
        });

        if (connection) {
          await this.getAccounts(connection.id);
        }
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw error;
    }
  }
}

export default new PluggyService();