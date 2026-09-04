const { z } = require('zod');

const createDealSchema = z.object({
  title: z.string().min(1, { message: 'Deal title is required' }),
  customer: z.string().min(1, { message: 'Customer ID is required' }),
  value: z.number().min(0, { message: 'Deal value must be non-negative' }),
  expectedClosingDate: z.string().optional(),
  stage: z
    .enum(['qualification', 'discovery', 'proposal', 'negotiation', 'won', 'lost'])
    .optional()
    .default('qualification'),
  probability: z.number().min(0).max(100).optional(),
  assignedTo: z.string().optional()
});

const updateDealSchema = z
  .object({
    title: z.string().min(1).optional(),
    value: z.number().min(0).optional(),
    expectedClosingDate: z.string().optional(),
    probability: z.number().min(0).max(100).optional(),
    stage: z.any().optional()
  })
  .refine(
    (data) => data.stage === undefined,
    {
      message: 'Stage updates must be made via the /api/deals/:id/stage endpoint',
      path: ['stage']
    }
  );

const stageUpdateSchema = z
  .object({
    stage: z.enum(['qualification', 'discovery', 'proposal', 'negotiation', 'won', 'lost'], {
      required_error: 'Valid stage is required'
    }),
    lostReason: z.string().optional(),
    probability: z.number().min(0).max(100).optional()
  })
  .refine(
    (data) => {
      if (data.stage === 'lost') {
        return !!data.lostReason && data.lostReason.trim().length > 0;
      }
      return true;
    },
    {
      message: 'A valid lostReason is required when marking a deal as lost',
      path: ['lostReason']
    }
  );

module.exports = {
  createDealSchema,
  updateDealSchema,
  stageUpdateSchema
};
