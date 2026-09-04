const { z } = require('zod');

const createActivitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'demo', 'reminder'], {
    required_error: 'Valid activity type is required'
  }),
  relatedTo: z.object({
    kind: z.enum(['Lead', 'Customer', 'Deal'], {
      required_error: 'Related kind must be Lead, Customer, or Deal'
    }),
    item: z.string().min(1, { message: 'Related item ID is required' })
  }),
  assignedTo: z.string().optional(),
  dueDate: z.string().min(1, { message: 'Due date is required' }),
  notes: z.string().optional()
});

const updateActivitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'demo', 'reminder']).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional()
});

const completeActivitySchema = z.object({
  notes: z.string().optional()
});

module.exports = {
  createActivitySchema,
  updateActivitySchema,
  completeActivitySchema
};
