import { z } from 'genkit';
import { randomUUID } from 'node:crypto';
import { volunteerCoordinatorAgent, type CoordinatorState } from '../agents/volunteer-coordinator.js';
import { evaluateCoordinatorRun } from '../evaluators/volunteer-coordinator-quality.js';
import {
  AGENT_LIMITS,
  AgentAuthError,
  AgentTimeoutError,
  AgentValidationError,
  createAgentAbortSignal,
  estimateRunCostUsd,
} from '../lib/production-controls.js';
import { buildReasoningTrace, logAgentRun } from '../lib/agent-run-logger.js';

export const volunteerCoordinatorInputSchema = z.object({
  goal: z.string().min(10).max(2000),
  eventId: z.string().min(2).max(128),
  sessionId: z.string().min(4).max(256).optional(),
});

export type VolunteerCoordinatorInput = z.infer<typeof volunteerCoordinatorInputSchema>;

export type VolunteerCoordinatorResponse = {
  ok: boolean;
  sessionId: string;
  snapshotId?: string;
  result: {
    summary: string;
    phase: CoordinatorState['phase'];
    reasoning: string;
    toolRequestCount: number;
    interrupts: Array<{ toolName: string; input: unknown }>;
    pendingHumanActions: string[];
  };
  reasoningTrace: ReturnType<typeof buildReasoningTrace>;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    estimatedCostUsd: number;
  };
  evaluation: {
    score: number;
    passed: boolean;
    notes: string;
  };
  finishReason: string;
  runLogId?: string;
};

type HandlerOptions = {
  authorizationHeader?: string | null;
};

export {
  AgentAuthError,
  AgentTimeoutError,
  AgentValidationError,
} from '../lib/production-controls.js';

export async function runVolunteerCoordinator(
  rawInput: unknown,
  opts: HandlerOptions = {},
): Promise<VolunteerCoordinatorResponse> {
  if (process.env.AGENT_API_KEY) {
    const token = opts.authorizationHeader?.replace(/^Bearer\s+/i, '').trim();
    if (token !== process.env.AGENT_API_KEY) {
      throw new AgentAuthError('Unauthorized');
    }
  }

  const parsed = volunteerCoordinatorInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AgentValidationError(parsed.error.errors.map((e) => e.message).join('; '));
  }

  const { goal, eventId, sessionId: providedSessionId } = parsed.data;
  const sessionId = providedSessionId || `vc-${eventId}-${randomUUID()}`;
  const abortSignal = createAgentAbortSignal();

  const userPrompt = [
    `Coordinator goal: ${goal}`,
    `Event ID: ${eventId}`,
    '',
    'Execute the full volunteer coordination workflow. Use tools in sequence.',
    'End with a concise summary for the human coordinator.',
  ].join('\n');

  const startedAt = Date.now();

  try {
    const chat = volunteerCoordinatorAgent.chat({ sessionId });
    const response = await chat.send(userPrompt, { abortSignal });

    const reasoningTrace = buildReasoningTrace(response.messages);
    const toolRequestCount = response.toolRequests.length;
    const interrupts = response.interrupts.map((i) => ({
      toolName: i.name,
      input: i.input,
    }));

    const phase = response.state?.phase || 'intake';
    const usageRaw = (response.raw as { usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } }).usage;
    const inputTokens = usageRaw?.inputTokens;
    const outputTokens = usageRaw?.outputTokens;
    const estimatedCostUsd = estimateRunCostUsd(inputTokens || 0, outputTokens || 0);

    if (estimatedCostUsd > AGENT_LIMITS.maxEstimatedCostUsd) {
      console.warn('[volunteerCoordinator] Cost threshold exceeded', {
        sessionId,
        estimatedCostUsd,
        limit: AGENT_LIMITS.maxEstimatedCostUsd,
      });
    }

    const evaluation = evaluateCoordinatorRun({
      goal,
      eventId,
      agentSummary: response.text,
      toolCallCount: toolRequestCount,
      finishReason: response.finishReason,
    });

    const payload: VolunteerCoordinatorResponse = {
      ok: response.finishReason !== 'failed',
      sessionId: response.sessionId || sessionId,
      snapshotId: response.snapshotId,
      result: {
        summary: response.text,
        phase,
        reasoning: response.reasoning,
        toolRequestCount,
        interrupts,
        pendingHumanActions: response.state?.pendingHumanActions || [],
      },
      reasoningTrace,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: usageRaw?.totalTokens,
        estimatedCostUsd,
      },
      evaluation,
      finishReason: response.finishReason,
    };

    payload.runLogId = await logAgentRun({
      agentName: 'volunteerCoordinator',
      sessionId: payload.sessionId,
      eventId,
      goal,
      finishReason: response.finishReason,
      summary: response.text,
      reasoningTrace,
      usage: payload.usage,
      evaluation,
    });

    console.info('[volunteerCoordinator] completed', {
      sessionId: payload.sessionId,
      durationMs: Date.now() - startedAt,
      finishReason: response.finishReason,
      toolRequestCount,
      evaluation: evaluation.score,
    });

    return payload;
  } catch (err) {
    if (abortSignal.aborted) {
      throw new AgentTimeoutError(`Agent run exceeded ${AGENT_LIMITS.timeoutMs}ms`);
    }
    throw err;
  }
}
