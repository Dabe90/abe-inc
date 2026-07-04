import { z } from 'genkit';
import { ai } from '../../genkit.config.js';
import { DEMO_ROSTER, queueDemoAction } from './sample-roster.js';

export const demoGetEventRosterTool = ai.defineTool(
  {
    name: 'demoGetEventRoster',
    description: 'Fetch demo volunteers and open shifts (sample data only).',
    inputSchema: z.object({
      eventId: z.string(),
    }),
    outputSchema: z.object({
      eventId: z.string(),
      eventName: z.string(),
      volunteers: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          skills: z.array(z.string()),
          availability: z.array(z.string()),
        }),
      ),
      openShifts: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          startTime: z.string(),
          capacity: z.number(),
          assignedVolunteerIds: z.array(z.string()),
        }),
      ),
      source: z.literal('demo'),
    }),
  },
  async ({ eventId }) => ({
    ...DEMO_ROSTER,
    eventId,
  }),
);

export const demoProposeVolunteerMatchesTool = ai.defineTool(
  {
    name: 'demoProposeVolunteerMatches',
    description: 'Propose demo shift matches for coordinator review (not real assignments).',
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
        .max(10),
    }),
    outputSchema: z.object({
      proposalId: z.string(),
      matchCount: z.number(),
      status: z.literal('pending_human_review'),
    }),
  },
  async ({ eventId, matches }) => ({
    proposalId: `demo_prop_${eventId}_${Date.now()}`,
    matchCount: matches.length,
    status: 'pending_human_review' as const,
  }),
);

export const demoQueueCoordinatorActionTool = ai.defineTool(
  {
    name: 'demoQueueCoordinatorAction',
    description: 'Queue a demo outbound action for human approval before anything sends.',
    inputSchema: z.object({
      eventId: z.string(),
      actionType: z.enum(['send_digest', 'confirm_assignments', 'escalate_leadership']),
      summary: z.string(),
    }),
    outputSchema: z.object({
      actionId: z.string(),
      status: z.literal('pending_human_review'),
      reviewRequired: z.boolean(),
    }),
  },
  async ({ actionType, summary }) => {
    const action = queueDemoAction({ actionType, summary });
    return {
      actionId: action.actionId,
      status: 'pending_human_review' as const,
      reviewRequired: true,
    };
  },
);

export const demoVolunteerTools = [
  demoGetEventRosterTool,
  demoProposeVolunteerMatchesTool,
  demoQueueCoordinatorActionTool,
];
