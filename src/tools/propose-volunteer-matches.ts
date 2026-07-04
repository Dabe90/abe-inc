import { z } from 'genkit';
import { ai } from '../../genkit.config.js';

/** Creates structured shift match proposals for human coordinator review. */
export const proposeVolunteerMatchesTool = ai.defineTool(
  {
    name: 'proposeVolunteerMatches',
    description:
      'Propose volunteer-to-shift matches based on skills and availability. Does NOT assign — queues proposals for human approval.',
    inputSchema: z.object({
      eventId: z.string(),
      matches: z
        .array(
          z.object({
            volunteerId: z.string(),
            volunteerName: z.string(),
            shiftId: z.string(),
            shiftTitle: z.string(),
            rationale: z.string(),
            confidence: z.enum(['high', 'medium', 'low']),
          }),
        )
        .min(1)
        .max(20),
    }),
    outputSchema: z.object({
      proposalId: z.string(),
      matchCount: z.number(),
      status: z.literal('pending_human_review'),
    }),
  },
  async ({ eventId, matches }) => {
    const proposalId = `prop_${eventId}_${Date.now()}`;

    try {
      const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
      await getFirestore()
        .collection('match_proposals')
        .doc(proposalId)
        .set({
          eventId,
          matches,
          status: 'pending_human_review',
          createdAt: FieldValue.serverTimestamp(),
        });
    } catch (err) {
      console.info('[proposeVolunteerMatches]', { proposalId, eventId, matchCount: matches.length, err });
    }

    return { proposalId, matchCount: matches.length, status: 'pending_human_review' as const };
  },
);
