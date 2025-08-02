// Shared types for FinanBot application

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccount {
  id: string;
  userId: string;
  bankCode: string;
  bankName: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT';
  accountNumber: string;
  agency?: string;
  balance: number;
  currency: string;
  isActive: boolean;
  connectedAt: Date;
  lastSyncAt?: Date;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string;
  subcategory?: string;
  description: string;
  merchantName?: string;
  date: Date;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  tags?: string[];
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

export interface OpenFinanceConnection {
  id: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  consentId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  permissions: string[];
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  metadata?: {
    tokens?: number;
    model?: string;
    context?: any;
  };
}

export interface FinancialInsight {
  id: string;
  userId: string;
  type: 'EXPENSE_ANALYSIS' | 'INCOME_ANALYSIS' | 'BUDGET_ALERT' | 'RECOMMENDATION';
  title: string;
  description: string;
  data: any;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isRead: boolean;
  createdAt: Date;
}

export interface BankInstitution {
  id: string;
  name: string;
  code: string;
  logo: string;
  color: string;
  supportedProducts: ('ACCOUNTS' | 'CREDIT_CARDS' | 'LOANS' | 'INVESTMENTS')[];
  isActive: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Open Finance API types
export interface OpenFinanceAccount {
  accountId: string;
  type: string;
  subtype: string;
  currency: string;
  accountNumber: string;
  checkDigit?: string;
  compeCode: string;
  branchCode: string;
  balance: {
    available: number;
    current: number;
  };
}

export interface OpenFinanceTransaction {
  transactionId: string;
  completedAuthorisedPaymentType: string;
  type: string;
  amount: number;
  transactionCurrency: string;
  creditDebitType: string;
  transactionDateTime: string;
  bookingDateTime: string;
  valueDateTime: string;
  transactionInformation: string;
  cnpjCpf?: string;
  payeeMCC?: string;
}

// Chart and Dashboard types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export interface DashboardMetrics {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  expensesByCategory: Record<string, number>;
  transactionTrends: ChartData;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} 