import axios from 'axios';
import { config } from '../config/env';
import prisma from '../config/database';
import type { OpenFinanceAccount, OpenFinanceTransaction, BankAccount, Transaction } from '../../../shared/types';

export interface OpenFinanceAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  consent_id: string;
}

export interface ConsentRequest {
  institutionId: string;
  permissions: string[];
  expirationDateTime: string;
}

// Brazilian banks configuration
export const BANKS = [
  { id: 'itau', name: 'Itaú', code: '341', logo: '/banks/itau.png', color: '#FF6B00' },
  { id: 'bradesco', name: 'Bradesco', code: '237', logo: '/banks/bradesco.png', color: '#E30613' },
  { id: 'bb', name: 'Banco do Brasil', code: '001', logo: '/banks/bb.png', color: '#FFDE00' },
  { id: 'nubank', name: 'Nubank', code: '260', logo: '/banks/nubank.png', color: '#8A05BE' },
  { id: 'santander', name: 'Santander', code: '033', logo: '/banks/santander.png', color: '#EC0000' },
  { id: 'caixa', name: 'Caixa Econômica Federal', code: '104', logo: '/banks/caixa.png', color: '#0066B3' },
  { id: 'xp', name: 'XP Banking', code: '348', logo: '/banks/xp.png', color: '#000000' },
  { id: 'btg', name: 'BTG Pactual', code: '208', logo: '/banks/btg.png', color: '#1B1B1B' },
];

class OpenFinanceService {
  private baseURL: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.baseURL = config.openFinance.baseUrl;
    this.clientId = config.openFinance.clientId;
    this.clientSecret = config.openFinance.clientSecret;
  }

  // Get authorization URL for bank connection
  async getAuthorizationUrl(institutionId: string, userId: string): Promise<string> {
    const permissions = [
      'ACCOUNTS_READ',
      'ACCOUNTS_BALANCES_READ',
      'RESOURCES_READ',
      'PAYMENTS_READ',
      'CREDIT_CARDS_ACCOUNTS_READ',
    ];

    const consentData: ConsentRequest = {
      institutionId,
      permissions,
      expirationDateTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    };

    try {
      const response = await axios.post(
        `${this.baseURL}/consents`,
        consentData,
        {
          headers: {
            'Authorization': `Bearer ${await this.getClientCredentialsToken()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const consentId = response.data.data.consentId;
      
      // Store consent request in database
      await prisma.openFinanceConnection.create({
        data: {
          userId,
          institutionId,
          institutionName: BANKS.find(b => b.id === institutionId)?.name || 'Unknown Bank',
          consentId,
          accessToken: '',
          refreshToken: '',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          permissions,
          status: 'ACTIVE',
        },
      });

      // Return authorization URL
      const authUrl = `${this.baseURL}/auth?consent_id=${consentId}&redirect_uri=${encodeURIComponent(config.openFinance.redirectUri)}`;
      return authUrl;
    } catch (error) {
      console.error('Open Finance auth error:', error);
      throw new Error('Failed to initiate bank connection');
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string, consentId: string): Promise<OpenFinanceAuthResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/token`,
        {
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.openFinance.redirectUri,
          consent_id: consentId,
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenData: OpenFinanceAuthResponse = response.data;

      // Find and update connection with tokens
      const connection = await prisma.openFinanceConnection.findFirst({
        where: { consentId }
      });

      if (!connection) {
        throw new Error('Connection not found');
      }

      await prisma.openFinanceConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
          status: 'ACTIVE',
        },
      });

      return tokenData;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  // Get accounts from Open Finance API
  async getAccounts(connectionId: string): Promise<BankAccount[]> {
    const connection = await prisma.openFinanceConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.status !== 'ACTIVE') {
      throw new Error('Invalid or inactive connection');
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/accounts`,
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'x-fapi-auth-date': new Date().toISOString(),
            'x-fapi-customer-ip-address': '127.0.0.1',
            'x-fapi-interaction-id': crypto.randomUUID(),
          },
        }
      );

      const accounts: OpenFinanceAccount[] = response.data.data;
      const bankAccounts: BankAccount[] = [];

      for (const account of accounts) {
        // Find existing account or create new one
        let savedAccount = await prisma.bankAccount.findFirst({
          where: {
            userId: connection.userId,
            accountNumber: account.accountNumber,
          }
        });

        if (savedAccount) {
          // Update existing account
          savedAccount = await prisma.bankAccount.update({
            where: { id: savedAccount.id },
            data: {
              balance: account.balance.current,
              lastSyncAt: new Date(),
            },
          });
        } else {
          // Create new account
          savedAccount = await prisma.bankAccount.create({
            data: {
              userId: connection.userId,
              bankCode: account.compeCode,
              bankName: connection.institutionName,
              accountType: this.mapAccountType(account.type),
              accountNumber: account.accountNumber,
              agency: account.branchCode,
              balance: account.balance.current,
              currency: account.currency,
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
      console.error('Get accounts error:', error);
      throw new Error('Failed to fetch accounts');
    }
  }

  // Get transactions from Open Finance API
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
    const from = fromDate?.toISOString() || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const to = toDate?.toISOString() || new Date().toISOString();

    try {
      const response = await axios.get(
        `${this.baseURL}/accounts/${account.accountNumber}/transactions`,
        {
          params: {
            fromDate: from,
            toDate: to,
          },
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'x-fapi-auth-date': new Date().toISOString(),
            'x-fapi-customer-ip-address': '127.0.0.1',
            'x-fapi-interaction-id': crypto.randomUUID(),
          },
        }
      );

      const transactions: OpenFinanceTransaction[] = response.data.data;
      const mappedTransactions: Transaction[] = [];

      for (const transaction of transactions) {
        // Save or update transaction in database
        const savedTransaction = await prisma.transaction.upsert({
          where: { id: transaction.transactionId },
          update: {
            amount: transaction.amount,
            status: 'COMPLETED',
          },
          create: {
            id: transaction.transactionId,
            accountId: account.id,
            amount: Math.abs(transaction.amount),
            type: transaction.creditDebitType === 'DEBIT' ? 'DEBIT' : 'CREDIT',
            category: this.categorizeTransaction(transaction.transactionInformation),
            description: transaction.transactionInformation,
            date: new Date(transaction.transactionDateTime),
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

      // Update last sync time
      await prisma.bankAccount.update({
        where: { id: accountId },
        data: { lastSyncAt: new Date() },
      });

      return mappedTransactions;
    } catch (error) {
      console.error('Get transactions error:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  // Refresh access token
  async refreshAccessToken(connectionId: string): Promise<void> {
    const connection = await prisma.openFinanceConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.refreshToken) {
      throw new Error('Connection not found or missing refresh token');
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/token`,
        {
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenData = response.data;

      await prisma.openFinanceConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || connection.refreshToken,
          expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        },
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      
      // Mark connection as expired
      await prisma.openFinanceConnection.update({
        where: { id: connectionId },
        data: { status: 'EXPIRED' },
      });
      
      throw new Error('Failed to refresh access token');
    }
  }

  // Helper method to get client credentials token
  private async getClientCredentialsToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseURL}/token`,
        {
          grant_type: 'client_credentials',
          scope: 'consents',
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('Client credentials error:', error);
      throw new Error('Failed to get client credentials token');
    }
  }

  // Map Open Finance account type to our enum
  private mapAccountType(type: string): 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' {
    switch (type.toUpperCase()) {
      case 'CONTA_DEPOSITO_A_VISTA':
      case 'CHECKING':
        return 'CHECKING';
      case 'CONTA_POUPANCA':
      case 'SAVINGS':
        return 'SAVINGS';
      case 'CONTA_PAGAMENTO_PRE_PAGA':
      case 'CREDIT_CARD':
        return 'CREDIT_CARD';
      case 'CONTA_DEPOSITO_A_PRAZO':
      case 'INVESTMENT':
        return 'INVESTMENT';
      default:
        return 'CHECKING';
    }
  }

  // Simple transaction categorization
  private categorizeTransaction(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('pix') || desc.includes('ted') || desc.includes('doc')) {
      return 'Transferências';
    }
    if (desc.includes('supermercado') || desc.includes('mercado') || desc.includes('alimentacao')) {
      return 'Alimentação';
    }
    if (desc.includes('combustivel') || desc.includes('posto') || desc.includes('gasolina')) {
      return 'Transporte';
    }
    if (desc.includes('farmacia') || desc.includes('medic') || desc.includes('hospital')) {
      return 'Saúde';
    }
    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('cinema')) {
      return 'Entretenimento';
    }
    if (desc.includes('salario') || desc.includes('rendimento') || desc.includes('deposito')) {
      return 'Receita';
    }
    
    return 'Outros';
  }
}

export default new OpenFinanceService(); 