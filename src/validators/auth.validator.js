const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  role: z.enum(['admin', 'sales_manager', 'sales_executive']).optional().default('sales_executive'),
  managerId: z.string().nullable().optional()
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' })
});

module.exports = {
  registerSchema,
  loginSchema
};
