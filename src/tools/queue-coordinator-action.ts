import { z } from 'genkit';
import { ai } from '../../genkit.config.js';

/** Queues outbound coordinator actions for human approval before anything is sent. */
export const queueCoordinatorActionTool = ai.defineTool(
  {
    name: 'queueCoordinatorAction',
    description:
      'Queue an outbound action (email digest, shift assignment confirmation) for human approval. Always use before claiming anything was sent.',
    inputSchema: z.object({
      eventId: z.string(),
      actionType: z.enum(['send_digest', 'confirm_assignments', 'escalate_leadership']),
      summary: z.string(),
      payload: z.record(z.unknown()).optional(),
    }),
    outputSchema: z.object({
      actionId: z.string(),
      status: z.literal('pending_human_review'),
      reviewRequired: z.boolean(),
    }),
  },
  async (input) => {
    const actionId = `action_${input.eventId}_${Date.now()}`;

    try {
      const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
      await getFirestore()
        .collection('coordinator_action_queue')
        .doc(actionId)
        .set({
          ...input,
          status: 'pending_human_review',
          reviewRequired: true,
          createdAt: FieldValue.serverTimestamp(),
        });
    } catch (err) {
      console.info('[queueCoordinatorAction]', { actionId, input, err });
    }

    return {
      actionId,
      status: 'pending_human_review' as const,
      reviewRequired: true,
    };
  },
);
