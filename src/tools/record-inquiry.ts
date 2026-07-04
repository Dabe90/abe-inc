import { z } from 'genkit';
import { ai } from '../../genkit.config.js';

/**
 * Tool-calling example: log inquiry for human review before any outbound action.
 * Wire to Firestore in Cloud Functions for production.
 */
export const recordInquiryTool = ai.defineTool(
  {
    name: 'recordInquiry',
    description:
      'Records a structured project inquiry summary for a human coordinator to review. Use after gathering goals, timeline, and category.',
    inputSchema: z.object({
      summary: z.string().describe('Concise summary of the client request'),
      category: z
        .enum(['agentic-ai', 'web-app', 'automation', 'other'])
        .describe('Primary project category'),
      urgency: z
        .enum(['low', 'medium', 'high'])
        .optional()
        .describe('Client-stated urgency if mentioned'),
    }),
    outputSchema: z.object({
      status: z.string(),
      reviewRequired: z.boolean(),
    }),
  },
  async ({ summary, category, urgency }) => {
    try {
      const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
      await getFirestore().collection('inquiry_triage_log').add({
        summary,
        category,
        urgency: urgency || 'medium',
        reviewRequired: true,
        status: 'queued_for_human_review',
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch {
      console.info('[recordInquiry]', { summary, category, urgency, reviewRequired: true });
    }
    return { status: 'queued_for_human_review', reviewRequired: true };
  },
);
