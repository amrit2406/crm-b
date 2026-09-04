const { z } = require('zod');

const convertLeadSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    company: z.string().optional().or(z.literal('')),
    assignedTo: z.string().optional(),
    deal: z
      .object({
        title: z.string().optional(),
        value: z.number().min(0, { message: 'Deal value must be at least 0' }).optional(),
        expectedClosingDate: z.string().optional()
      })
      .optional()
  })
  .refine(
    (data) => {
      if (data.deal) {
        return (
          !!data.deal.title &&
          data.deal.title.trim() !== '' &&
          data.deal.value !== undefined &&
          !!data.deal.expectedClosingDate
        );
      }
      return true;
    },
    {
      message: 'When providing deal info during lead conversion, title, value, and expectedClosingDate are all required',
      path: ['deal']
    }
  );

module.exports = {
  convertLeadSchema
};
