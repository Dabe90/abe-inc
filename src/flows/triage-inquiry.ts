import { z } from 'genkit';
import { ai } from '../../genkit.config.js';

const triageSchema = z.object({
  summary: z.string(),
  category: z.enum(['agentic-ai', 'web-app', 'automation', 'other']),
  urgency: z.enum(['low', 'medium', 'high']),
  recommendAudit: z.boolean(),
});

/** Async triage for inbound contact form submissions (Firestore trigger). */
export const triageInquiryFlow = ai.defineFlow(
  {
    name: 'triageInquiry',
    inputSchema: z.object({
      name: z.string(),
      email: z.string(),
      service: z.string(),
      message: z.string(),
    }),
    outputSchema: triageSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      prompt: `You triage inbound project inquiries for Abe Stack (agentic AI, web apps, automation).

Name: ${input.name}
Email: ${input.email}
Service interest: ${input.service}
Message:
${input.message}

Return JSON only:
- summary: one sentence for the coordinator
- category: agentic-ai | web-app | automation | other
- urgency: low | medium | high
- recommendAudit: true if manual ops workflows might fit agentic AI`,
      output: { schema: triageSchema },
    });

    if (!output) {
      throw new Error('Triage model returned no structured output');
    }

    return output;
  },
);
