const dotenv = require('dotenv');
const { z } = require('zod');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGO_URI: z.string().min(1, { message: 'MONGO_URI is required' }),
  JWT_ACCESS_SECRET: z.string().min(1, { message: 'JWT_ACCESS_SECRET is required' }),
  JWT_REFRESH_SECRET: z.string().min(1, { message: 'JWT_REFRESH_SECRET is required' }),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(_env.error.format(), null, 2));
  throw new Error('Invalid or missing environment variables in .env');
}

module.exports = _env.data;
