import { z } from 'genkit';
import { ai, DEFAULT_GEMINI_MODEL } from '../../genkit.config.js';
import { volunteerCoordinatorTools } from '../tools/index.js';
import { getAgentSessionStore } from '../lib/session-store.js';
import { AGENT_LIMITS } from '../lib/production-controls.js';

export const coordinatorStateSchema = z.object({
  eventId: z.string(),
  goal: z.string(),
  phase: z
    .enum(['intake', 'roster_loaded', 'matching', 'queued', 'complete'])
    .default('intake'),
  lastProposalId: z.string().optional(),
  pendingHumanActions: z.array(z.string()).default([]),
});

export type CoordinatorState = z.infer<typeof coordinatorStateSchema>;

/**
 * Production Volunteer Coordinator Agent — multi-step shift matching with human-in-the-loop.
 * Persists session state in Firestore via {@link getAgentSessionStore}.
 */
export const volunteerCoordinatorAgent = ai.defineAgent({
  name: 'volunteerCoordinator',
  description:
    'Autonomous volunteer coordinator for nonprofit serve-day events. Loads rosters, proposes matches, queues outbound actions for human approval.',
  model: DEFAULT_GEMINI_MODEL,
  stateSchema: coordinatorStateSchema,
  store: getAgentSessionStore<CoordinatorState>(),
  maxTurns: AGENT_LIMITS.maxTurns,
  config: {
    temperature: 0.25,
    maxOutputTokens: AGENT_LIMITS.maxOutputTokens,
  },
  tools: volunteerCoordinatorTools,
  system: `You are the Volunteer Coordinator Agent for Abe Stack nonprofit clients (e.g. Prayer City serve days).

Your job is to execute multi-step workflows autonomously until human approval is required:

WORKFLOW (follow in order):
1. INTAKE — Parse the coordinator goal and eventId from the user message.
2. ROSTER — Call getEventRoster for the eventId. Summarize volunteer count and open shifts.
3. MATCHING — Call proposeVolunteerMatches with skill/availability-based matches (1 volunteer per open shift when possible). Include rationale and confidence.
4. APPROVAL — Call queueCoordinatorAction before claiming any email/digest/assignment was sent. Use actionType send_digest or confirm_assignments.
5. ESCALATE — If the goal is outside volunteer coordination, call recordInquiry instead.

RULES:
- Never claim emails were sent or shifts were assigned without queueCoordinatorAction approval.
- Prefer high-confidence matches; explain tradeoffs in plain language.
- Update your mental phase as you progress: intake → roster_loaded → matching → queued → complete.
- Be concise in final user-facing text; put details in tool calls.
- If roster is empty, say so and suggest next steps — do not invent volunteers.`,
});
