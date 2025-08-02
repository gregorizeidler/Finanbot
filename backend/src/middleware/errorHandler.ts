import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { config } from '../config/env';

// Custom error interface
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

// Create custom error
export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string
): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
};

// Global error handler middleware
export const errorHandler = (
  error: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  // Handle custom application errors
  if ('statusCode' in error && error.isOperational) {
    statusCode = error.statusCode || 500;
    errorCode = error.code || 'APP_ERROR';
    message = error.message;
  }

  // Handle Prisma errors
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        errorCode = 'DUPLICATE_ENTRY';
        message = 'A record with this data already exists';
        details = { field: error.meta?.target };
        break;
      case 'P2025':
        statusCode = 404;
        errorCode = 'RECORD_NOT_FOUND';
        message = 'Record not found';
        break;
      case 'P2003':
        statusCode = 400;
        errorCode = 'FOREIGN_KEY_CONSTRAINT';
        message = 'Related record not found';
        break;
      case 'P2014':
        statusCode = 400;
        errorCode = 'REQUIRED_RELATION_MISSING';
        message = 'Required relation is missing';
        break;
      default:
        statusCode = 400;
        errorCode = 'DATABASE_ERROR';
        message = 'Database operation failed';
        break;
    }
  }

  // Handle Prisma validation errors
  else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid data provided';
  }

  // Handle Prisma initialization errors
  else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 500;
    errorCode = 'DATABASE_CONNECTION_ERROR';
    message = 'Database connection failed';
  }

  // Handle other known error types
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
  }

  else if (error.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_DATA_TYPE';
    message = 'Invalid data type provided';
  }

  // Log error in development
  if (config.env === 'development') {
    console.error('Error Details:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  // Log error in production (you might want to use a proper logger)
  if (config.env === 'production') {
    console.error('Production Error:', {
      message: error.message,
      code: errorCode,
      statusCode,
      url: req.url,
      method: req.method,
      userId: req.user?.id,
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
      ...(config.env === 'development' && {
        stack: error.stack,
        originalError: error.message,
      }),
    },
  });
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 