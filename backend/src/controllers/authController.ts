import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import prisma from '../config/database';
import { generateTokens, verifyRefreshToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import type { LoginRequest, RegisterRequest, ApiResponse, AuthResponse } from '../../../shared/types';

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// Register new user
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = registerSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400, 'VALIDATION_ERROR');
  }

  const { name, email, password }: RegisterRequest = value;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw createError('User with this email already exists', 409, 'USER_EXISTS');
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Generate tokens
  const tokens = generateTokens(user);

  const response: ApiResponse<AuthResponse> = {
    success: true,
    data: {
      user,
      ...tokens,
    },
  };

  res.status(201).json(response);
});

// Login user
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = loginSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400, 'VALIDATION_ERROR');
  }

  const { email, password }: LoginRequest = value;

  // Find user with password
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
  };
  
  const tokens = generateTokens(userData);

  const response: ApiResponse<AuthResponse> = {
    success: true,
    data: {
      user: {
        ...userData,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ...tokens,
    },
  };

  res.json(response);
});

// Refresh access token
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = refreshTokenSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400, 'VALIDATION_ERROR');
  }

  const { refreshToken: token } = value;

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(token);

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        user,
        ...tokens,
      },
    };

    res.json(response);
  } catch (error) {
    throw createError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }
});

// Get current user profile
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          accounts: true,
          connections: true,
          messages: true,
        },
      },
    },
  });

  if (!user) {
    throw createError('User not found', 404, 'USER_NOT_FOUND');
  }

  const response: ApiResponse = {
    success: true,
    data: {
      ...user,
      stats: {
        accountsCount: user._count.accounts,
        connectionsCount: user._count.connections,
        messagesCount: user._count.messages,
      },
    },
  };

  res.json(response);
});

// Logout user (optional - mainly for clearing client-side tokens)
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  };

  res.json(response);
}); 