import { Router } from 'express';
import { Request, Response } from 'express';
import Joi from 'joi';
import prisma from '../config/database';
import { asyncHandler, createError } from '../middleware/errorHandler';
import openFinanceService, { BANKS } from '../services/openFinanceService';
import type { ApiResponse } from '../../../shared/types';

const router = Router();

// Validation schemas
const connectBankSchema = Joi.object({
  institutionId: Joi.string().required(),
});

const exchangeCodeSchema = Joi.object({
  code: Joi.string().required(),
  consentId: Joi.string().required(),
});

// Get list of supported banks
export const getBanks = asyncHandler(async (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: BANKS,
  };

  res.json(response);
});

// Initiate bank connection
export const connectBank = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = connectBankSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400, 'VALIDATION_ERROR');
  }

  const { institutionId } = value;
  const userId = req.user!.id;

  try {
    const authUrl = await openFinanceService.getAuthorizationUrl(institutionId, userId);

    const response: ApiResponse = {
      success: true,
      data: {
        authorizationUrl: authUrl,
        institutionId,
      },
    };

    res.json(response);
  } catch (error) {
    throw createError('Failed to initiate bank connection', 500, 'BANK_CONNECTION_ERROR');
  }
});

// Exchange authorization code for tokens
export const exchangeCode = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = exchangeCodeSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400, 'VALIDATION_ERROR');
  }

  const { code, consentId } = value;

  try {
    const tokenData = await openFinanceService.exchangeCodeForToken(code, consentId);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Bank connected successfully',
        expiresIn: tokenData.expires_in,
      },
    };

    res.json(response);
  } catch (error) {
    throw createError('Failed to exchange authorization code', 500, 'TOKEN_EXCHANGE_ERROR');
  }
});

// Get user's bank connections
export const getConnections = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const connections = await prisma.openFinanceConnection.findMany({
    where: { userId },
    select: {
      id: true,
      institutionId: true,
      institutionName: true,
      status: true,
      permissions: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const response: ApiResponse = {
    success: true,
    data: connections,
  };

  res.json(response);
});

// Sync accounts for a connection
export const syncAccounts = asyncHandler(async (req: Request, res: Response) => {
  const { connectionId } = req.params;

  try {
    const accounts = await openFinanceService.getAccounts(connectionId);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Accounts synced successfully',
        accounts,
        count: accounts.length,
      },
    };

    res.json(response);
  } catch (error) {
    throw createError('Failed to sync accounts', 500, 'SYNC_ERROR');
  }
});

// Sync transactions for an account
export const syncTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.params;
  const { fromDate, toDate } = req.query;

  try {
    const from = fromDate ? new Date(fromDate as string) : undefined;
    const to = toDate ? new Date(toDate as string) : undefined;

    const transactions = await openFinanceService.getTransactions(accountId, from, to);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Transactions synced successfully',
        transactions,
        count: transactions.length,
      },
    };

    res.json(response);
  } catch (error) {
    throw createError('Failed to sync transactions', 500, 'SYNC_ERROR');
  }
});

// Revoke bank connection
export const revokeConnection = asyncHandler(async (req: Request, res: Response) => {
  const { connectionId } = req.params;
  const userId = req.user!.id;

  // Update connection status
  await prisma.openFinanceConnection.updateMany({
    where: { 
      id: connectionId,
      userId,
    },
    data: { 
      status: 'REVOKED',
    },
  });

  // Deactivate associated accounts
  await prisma.bankAccount.updateMany({
    where: {
      userId,
      user: {
        connections: {
          some: { id: connectionId },
        },
      },
    },
    data: {
      isActive: false,
    },
  });

  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Bank connection revoked successfully',
    },
  };

  res.json(response);
});

// Routes
router.get('/banks', getBanks);
router.post('/connect', connectBank);
router.post('/exchange-code', exchangeCode);
router.get('/connections', getConnections);
router.post('/connections/:connectionId/sync-accounts', syncAccounts);
router.post('/accounts/:accountId/sync-transactions', syncTransactions);
router.delete('/connections/:connectionId', revokeConnection);

export default router; 