const { z } = require('zod');

const createLeadSchema = z.object({
  name: z.string().min(1, { message: 'Lead name is required' }),
  email: z.string().email({ message: 'Invalid email format' }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  source: z.enum(['website', 'referral', 'social_media', 'email', 'phone'], {
    required_error: 'Valid source is required'
  }),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  assignedTo: z.string().optional()
});

const updateLeadSchema = createLeadSchema.partial();

const assignLeadSchema = z.object({
  assignedTo: z.string().min(1, { message: 'Assigned user ID is required' })
});

const statusUpdateSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'converted'], {
    required_error: 'Valid status is required'
  })
});

const addNoteSchema = z.object({
  text: z.string().min(1, { message: 'Note text cannot be empty' })
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  statusUpdateSchema,
  addNoteSchema
};
