import { z } from 'genkit';
import { randomUUID } from 'node:crypto';
import {
  demoVolunteerCoordinatorAgent,
  DEMO_EVENT_ID,
  type DemoCoordinatorState,
} from './demo-volunteer-agent.js';
import { assertDemoRateLimit, DemoRateLimitError } from './demo-rate-limiter.js';
import { demoActionQueue, resetDemoQueue } from './sample-roster.js';
import { buildReasoningTrace } from '../lib/agent-run-logger.js';
import { evaluateCoordinatorRun } from '../evaluators/volunteer-coordinator-quality.js';
import { estimateRunCostUsd } from '../lib/production-controls.js';

export const DEMO_DISCLAIMER = 'Demo mode — not real client data';

export const demoVolunteerInputSchema = z.object({
  goal: z.string().min(10).max(1500),
  eventId: z.string().min(2).max(128).optional(),
  sessionId: z.string().min(4).max(256).optional(),
});

export type DemoVolunteerInput = z.infer<typeof demoVolunteerInputSchema>;

export type DemoVolunteerResponse = {
  ok: boolean;
  demoMode: true;
  disclaimer: string;
  sessionId: string;
  clientId: 'demo';
  projectId: 'demo';
  result: {
    summary: string;
    phase: DemoCoordinatorState['phase'];
    reasoning: string;
    toolRequestCount: number;
    pendingHumanActions: string[];
  };
  finalActions: Array<{
    actionId: string;
    actionType: string;
    summary: string;
    status: string;
  }>;
  reasoningTrace: ReturnType<typeof buildReasoningTrace>;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd: number;
  };
  evaluation: {
    score: number;
    passed: boolean;
    notes: string;
  };
  finishReason: string;
  rateLimit?: {
    remaining: number;
    resetAt: number;
  };
};

type RunOptions = {
  ip?: string;
};

export class DemoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoValidationError';
  }
}

export { DemoRateLimitError };

async function logDemoRun(entry: Record<string, unknown>): Promise<void> {
  try {
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const { getApps, initializeApp } = await import('firebase-admin/app');
    if (!getApps().length) initializeApp();
    await getFirestore()
      .collection('demo_agent_runs')
      .add({ ...entry, createdAt: FieldValue.serverTimestamp() });
  } catch {
    // Optional — demo works without Firestore credentials.
  }
}

export async function runDemoVolunteerAgent(
  rawInput: unknown,
  opts: RunOptions = {},
): Promise<DemoVolunteerResponse> {
  const parsed = demoVolunteerInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new DemoValidationError(parsed.error.errors.map((e) => e.message).join('; '));
  }

  const rateLimit = assertDemoRateLimit(opts.ip || 'unknown');
  const { goal } = parsed.data;
  const eventId = DEMO_EVENT_ID;
  const sessionId = parsed.data.sessionId || `demo-${randomUUID()}`;

  resetDemoQueue();

  const userPrompt = [
    `DEMO RUN — fictional data only.`,
    `Event ID: ${eventId}`,
    `Coordinator goal: ${goal}`,
    '',
    'Run the volunteer coordination workflow with demo tools only.',
    'End with a concise summary for the human coordinator.',
  ].join('\n');

  const startedAt = Date.now();
  const abortSignal =
    typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(Number(process.env.DEMO_AGENT_TIMEOUT_MS || 45_000))
      : undefined;

  const chat = demoVolunteerCoordinatorAgent.chat({ sessionId });
  const response = await chat.send(userPrompt, abortSignal ? { abortSignal } : undefined);

  const reasoningTrace = buildReasoningTrace(response.messages);
  const toolRequestCount = response.toolRequests.length;
  const phase = response.state?.phase || 'complete';
  const usageRaw = (response.raw as {
    usage?: { inputTokens?: number; outputTokens?: number };
  }).usage;
  const inputTokens = usageRaw?.inputTokens;
  const outputTokens = usageRaw?.outputTokens;
  const estimatedCostUsd = estimateRunCostUsd(inputTokens || 0, outputTokens || 0);

  const pendingHumanActions = [
    ...(response.state?.pendingHumanActions || []),
    ...demoActionQueue.map((a) => a.summary),
  ];

  const evaluation = evaluateCoordinatorRun({
    goal,
    eventId,
    agentSummary: response.text,
    toolCallCount: toolRequestCount,
    finishReason: response.finishReason,
  });

  const payload: DemoVolunteerResponse = {
    ok: response.finishReason !== 'failed',
    demoMode: true,
    disclaimer: DEMO_DISCLAIMER,
    sessionId: response.sessionId || sessionId,
    clientId: 'demo',
    projectId: 'demo',
    result: {
      summary: response.text,
      phase,
      reasoning: response.reasoning,
      toolRequestCount,
      pendingHumanActions,
    },
    finalActions: demoActionQueue.map((a) => ({
      actionId: a.actionId,
      actionType: a.actionType,
      summary: a.summary,
      status: a.status,
    })),
    reasoningTrace,
    usage: { inputTokens, outputTokens, estimatedCostUsd },
    evaluation,
    finishReason: response.finishReason,
    rateLimit,
  };

  await logDemoRun({
    sessionId: payload.sessionId,
    goal,
    eventId,
    finishReason: response.finishReason,
    toolRequestCount,
    durationMs: Date.now() - startedAt,
    estimatedCostUsd,
  });

  return payload;
}
