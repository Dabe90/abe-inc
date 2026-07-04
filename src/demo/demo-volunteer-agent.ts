import { z } from 'genkit';
import { ai, DEFAULT_GEMINI_MODEL } from '../../genkit.config.js';
import { demoVolunteerTools } from './demo-tools.js';
import { DEMO_EVENT_ID } from './sample-roster.js';

export const demoCoordinatorStateSchema = z.object({
  eventId: z.string(),
  goal: z.string(),
  phase: z
    .enum(['intake', 'roster_loaded', 'matching', 'queued', 'complete'])
    .default('intake'),
  pendingHumanActions: z.array(z.string()).default([]),
});

export type DemoCoordinatorState = z.infer<typeof demoCoordinatorStateSchema>;

/** Public-site demo agent — sample data only, no production Firestore reads. */
export const demoVolunteerCoordinatorAgent = ai.defineAgent({
  name: 'demoVolunteerCoordinator',
  description:
    'Safe public demo of the Volunteer Coordinator Agent using fictional roster data.',
  model: DEFAULT_GEMINI_MODEL,
  stateSchema: demoCoordinatorStateSchema,
  maxTurns: 8,
  config: {
    temperature: 0.2,
    maxOutputTokens: 1536,
  },
  tools: demoVolunteerTools,
  system: `You are the Abe Stack Volunteer Coordinator DEMO agent.

IMPORTANT: This is a public marketing demo. All data is fictional sample data — never reference real clients, emails, or production systems.

WORKFLOW:
1. Call demoGetEventRoster for the provided eventId.
2. Call demoProposeVolunteerMatches with thoughtful skill-based matches for open shifts.
3. Call demoQueueCoordinatorAction with actionType send_digest before finishing.
4. Summarize proposed matches and note that a human must approve before anything sends.

Keep the final summary under 120 words. Be concrete about which demo volunteers matched which shifts.`,
});

export { DEMO_EVENT_ID };
