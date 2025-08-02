import { Request, Response } from 'express';
import Joi from 'joi';
import prisma from '../config/database';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { generateChatResponse, saveChatMessage, getFinancialContext } from '../services/openaiService';
import { io } from '../server';
import type { ApiResponse, ChatMessage } from '../../../shared/types';

// Validation schemas
const chatMessageSchema = Joi.object({
  message: Joi.string().min(1).max(1000).required(),
});

const getChatHistorySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// Send chat message and get AI response
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = chatMessageSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400, 'VALIDATION_ERROR');
  }

  const { message } = value;
  const userId = req.user!.id;

  try {
    // Save user message
    const userMessage: ChatMessage = {
      id: '', // Will be set by database
      userId,
      content: message,
      role: 'user',
      timestamp: new Date(),
    };

    const savedUserMessage = await saveChatMessage(userMessage);

    // Get financial context
    const context = await getFinancialContext(userId);

    // Generate AI response
    const aiResponse = await generateChatResponse({
      message,
      userId,
      context,
    });

    // Save AI message
    const aiMessage: ChatMessage = {
      id: '', // Will be set by database
      userId,
      content: aiResponse.response,
      role: 'assistant',
      timestamp: new Date(),
      metadata: {
        model: 'gpt-4-turbo-preview',
        context: {
          confidence: aiResponse.confidence,
          suggestedActions: aiResponse.suggestedActions,
          insights: aiResponse.insights,
        },
      },
    };

    const savedAiMessage = await saveChatMessage(aiMessage);

    // Emit messages to user's room via Socket.IO
    io.to(`user:${userId}`).emit('new-message', savedUserMessage);
    io.to(`user:${userId}`).emit('new-message', savedAiMessage);

    const response: ApiResponse = {
      success: true,
      data: {
        userMessage: savedUserMessage,
        aiMessage: savedAiMessage,
        suggestedActions: aiResponse.suggestedActions,
        insights: aiResponse.insights,
        confidence: aiResponse.confidence,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    throw createError('Failed to process chat message', 500, 'CHAT_ERROR');
  }
});

// Get chat history
export const getChatHistory = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = getChatHistorySchema.validate(req.query);
  
  if (error) {
    throw createError(error.details[0].message, 400, 'VALIDATION_ERROR');
  }

  const { page, limit } = value;
  const userId = req.user!.id;
  const skip = (page - 1) * limit;

  // Get messages with pagination
  const [messages, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    prisma.chatMessage.count({
      where: { userId },
    }),
  ]);

  const response: ApiResponse = {
    success: true,
    data: messages.map(msg => ({
      id: msg.id,
      userId: msg.userId,
      content: msg.content,
      role: msg.role,
      timestamp: msg.timestamp,
      metadata: {
        tokens: msg.tokens,
        model: msg.model,
        context: msg.context,
      },
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };

  res.json(response);
});

// Delete chat history
export const deleteChatHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  await prisma.chatMessage.deleteMany({
    where: { userId },
  });

  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Chat history deleted successfully',
    },
  };

  res.json(response);
});

// Get financial context (for debugging or advanced users)
export const getContext = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const context = await getFinancialContext(userId);

  const response: ApiResponse = {
    success: true,
    data: context,
  };

  res.json(response);
}); 