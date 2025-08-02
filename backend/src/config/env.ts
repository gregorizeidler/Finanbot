import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables from .env file
dotenv.config();

// Define validation schema for environment variables
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  
  // Database
  DATABASE_URL: Joi.string().required(),
  
  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  
  // OpenAI
  OPENAI_API_KEY: Joi.string().required(),
  OPENAI_MODEL: Joi.string().default('gpt-4-turbo-preview'),
  
  // Open Finance
  OPEN_FINANCE_BASE_URL: Joi.string().uri().required(),
  OPEN_FINANCE_CLIENT_ID: Joi.string().required(),
  OPEN_FINANCE_CLIENT_SECRET: Joi.string().required(),
  OPEN_FINANCE_REDIRECT_URI: Joi.string().uri().required(),
  
  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  
  // Socket.IO
  SOCKET_IO_CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
});

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env, {
  allowUnknown: true,
  stripUnknown: true,
});

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

// Export validated environment configuration
export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  
  database: {
    url: envVars.DATABASE_URL,
  },
  
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  
  openai: {
    apiKey: envVars.OPENAI_API_KEY,
    model: envVars.OPENAI_MODEL,
  },
  
  openFinance: {
    baseUrl: envVars.OPEN_FINANCE_BASE_URL,
    clientId: envVars.OPEN_FINANCE_CLIENT_ID,
    clientSecret: envVars.OPEN_FINANCE_CLIENT_SECRET,
    redirectUri: envVars.OPEN_FINANCE_REDIRECT_URI,
  },
  
  cors: {
    origin: envVars.CORS_ORIGIN,
  },
  
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  
  logging: {
    level: envVars.LOG_LEVEL,
  },
  
  socketIO: {
    corsOrigin: envVars.SOCKET_IO_CORS_ORIGIN,
  },
} as const;

export default config; 