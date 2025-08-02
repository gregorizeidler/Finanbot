import { Router } from 'express';
import { Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import prisma from '../config/database';
import type { ApiResponse, DashboardMetrics, ChartData } from '../../../shared/types';

const router = Router();

// Get dashboard overview
export const getDashboardOverview = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get accounts
  const accounts = await prisma.bankAccount.findMany({
    where: { userId, isActive: true },
  });

  // Calculate total balance
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  // Get monthly transactions
  const monthlyTransactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
      date: {
        gte: firstDayOfMonth,
        lte: lastDayOfMonth,
      },
    },
  });

  // Calculate monthly income and expenses
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  const expensesByCategory: Record<string, number> = {};

  monthlyTransactions.forEach((transaction) => {
    if (transaction.type === 'CREDIT') {
      monthlyIncome += transaction.amount;
    } else {
      monthlyExpenses += transaction.amount;
      expensesByCategory[transaction.category] = 
        (expensesByCategory[transaction.category] || 0) + transaction.amount;
    }
  });

  // Calculate savings rate
  const savingsRate = monthlyIncome > 0 
    ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 
    : 0;

  // Get transaction trends for last 6 months
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const trendTransactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
      date: {
        gte: sixMonthsAgo,
      },
    },
    orderBy: { date: 'asc' },
  });

  // Group by month for trends
  const monthlyTrends: Record<string, { income: number; expenses: number }> = {};
  trendTransactions.forEach((transaction) => {
    const monthKey = transaction.date.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyTrends[monthKey]) {
      monthlyTrends[monthKey] = { income: 0, expenses: 0 };
    }
    
    if (transaction.type === 'CREDIT') {
      monthlyTrends[monthKey].income += transaction.amount;
    } else {
      monthlyTrends[monthKey].expenses += transaction.amount;
    }
  });

  const transactionTrends: ChartData = {
    labels: Object.keys(monthlyTrends).sort(),
    datasets: [
      {
        label: 'Receitas',
        data: Object.keys(monthlyTrends).sort().map(month => monthlyTrends[month].income),
        backgroundColor: '#10b981',
        borderColor: '#059669',
      },
      {
        label: 'Gastos',
        data: Object.keys(monthlyTrends).sort().map(month => monthlyTrends[month].expenses),
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
      },
    ],
  };

  const metrics: DashboardMetrics = {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    expensesByCategory,
    transactionTrends,
  };

  const response: ApiResponse<DashboardMetrics> = {
    success: true,
    data: metrics,
  };

  res.json(response);
});

// Get expense breakdown by category
export const getExpenseBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { period } = req.query; // 'month', 'quarter', 'year'
  
  let startDate: Date;
  const now = new Date();
  
  switch (period) {
    case 'quarter':
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default: // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
      type: 'DEBIT',
      date: { gte: startDate },
    },
  });

  const categoryBreakdown: Record<string, number> = {};
  let totalExpenses = 0;

  transactions.forEach((transaction) => {
    categoryBreakdown[transaction.category] = 
      (categoryBreakdown[transaction.category] || 0) + transaction.amount;
    totalExpenses += transaction.amount;
  });

  // Convert to percentage and sort
  const breakdown = Object.entries(categoryBreakdown)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalExpenses) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  const response: ApiResponse = {
    success: true,
    data: {
      breakdown,
      totalExpenses,
      period,
      transactionCount: transactions.length,
    },
  };

  res.json(response);
});

// Get recent transactions
export const getRecentTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const limit = parseInt(req.query.limit as string) || 10;

  const transactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
    },
    include: {
      account: {
        select: {
          bankName: true,
          accountType: true,
        },
      },
    },
    orderBy: { date: 'desc' },
    take: limit,
  });

  const response: ApiResponse = {
    success: true,
    data: transactions.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      merchantName: transaction.merchantName,
      date: transaction.date,
      status: transaction.status,
      bankName: transaction.account.bankName,
      accountType: transaction.account.accountType,
    })),
  };

  res.json(response);
});

// Get account balances
export const getAccountBalances = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const accounts = await prisma.bankAccount.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      bankName: true,
      accountType: true,
      balance: true,
      currency: true,
      lastSyncAt: true,
    },
    orderBy: { balance: 'desc' },
  });

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  const response: ApiResponse = {
    success: true,
    data: {
      accounts,
      totalBalance,
      accountCount: accounts.length,
    },
  };

  res.json(response);
});

// Get financial insights
export const getInsights = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const insights = await prisma.financialInsight.findMany({
    where: { userId },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 10,
  });

  const response: ApiResponse = {
    success: true,
    data: insights,
  };

  res.json(response);
});

// Mark insight as read
export const markInsightAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { insightId } = req.params;
  const userId = req.user!.id;

  await prisma.financialInsight.updateMany({
    where: { 
      id: insightId,
      userId,
    },
    data: { isRead: true },
  });

  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Insight marked as read',
    },
  };

  res.json(response);
});

// Routes
router.get('/overview', getDashboardOverview);
router.get('/expenses/breakdown', getExpenseBreakdown);
router.get('/transactions/recent', getRecentTransactions);
router.get('/accounts/balances', getAccountBalances);
router.get('/insights', getInsights);
router.patch('/insights/:insightId/read', markInsightAsRead);

export default router; 