import { z } from 'genkit';
import { randomUUID } from 'node:crypto';
import { volunteerCoordinatorAgent, type CoordinatorState } from '../agents/volunteer-coordinator.js';
import { evaluateCoordinatorRun } from '../evaluators/volunteer-coordinator-quality.js';
import {
  AGENT_LIMITS,
  AgentAuthError,
  AgentCostLimitError,
  AgentRateLimitError,
  AgentTimeoutError,
  AgentValidationError,
  createAgentAbortSignal,
  estimateRunCostUsd,
} from '../lib/production-controls.js';
import {
  buildReasoningTrace,
  logAgentRun,
  logAgentRunFailure,
} from '../lib/agent-run-logger.js';
import { resolveAgentAuth, resolveAgentAuthOptional } from '../lib/agent-auth.js';
import {
  assertEventAllowed,
  resolveClientLimits,
} from '../lib/agent-client-config.js';
import { assertAgentQuota, recordAgentUsage } from '../lib/agent-rate-limiter.js';
import { logAgentEvent } from '../lib/structured-logger.js';
import { upsertSessionIndex } from '../lib/session-index.js';

export const volunteerCoordinatorInputSchema = z.object({
  goal: z.string().min(10).max(2000),
  eventId: z.string().min(2).max(128),
  sessionId: z.string().min(4).max(256).optional(),
  clientId: z.string().min(2).max(64).optional(),
  projectId: z.string().min(2).max(64).optional(),
});

export type VolunteerCoordinatorInput = z.infer<typeof volunteerCoordinatorInputSchema>;

export type VolunteerCoordinatorResponse = {
  ok: boolean;
  sessionId: string;
  clientId: string;
  projectId: string;
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
  usageSummary?: {
    hourRequests: number;
    dayRequests: number;
    dayCostUsd: number;
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
  requireAuth?: boolean;
};

export {
  AgentAuthError,
  AgentCostLimitError,
  AgentRateLimitError,
  AgentTimeoutError,
  AgentValidationError,
} from '../lib/production-controls.js';

export async function runVolunteerCoordinator(
  rawInput: unknown,
  opts: HandlerOptions = {},
): Promise<VolunteerCoordinatorResponse> {
  const startedAt = Date.now();
  let authContext: Awaited<ReturnType<typeof resolveAgentAuthOptional>> | undefined;
  let parsedInput: VolunteerCoordinatorInput | undefined;
  let sessionId = '';

  try {
    authContext =
      opts.requireAuth === false
        ? await resolveAgentAuthOptional(opts.authorizationHeader)
        : await resolveAgentAuth(opts.authorizationHeader ?? null);

    const parsed = volunteerCoordinatorInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new AgentValidationError(parsed.error.errors.map((e) => e.message).join('; '));
    }
    parsedInput = parsed.data;

    const { goal, eventId, sessionId: providedSessionId } = parsedInput;
    const { clientId, projectId, clientConfig } = authContext;

    if (parsedInput.clientId && parsedInput.clientId !== clientId) {
      throw new AgentAuthError('clientId does not match authenticated client');
    }
    if (parsedInput.projectId && parsedInput.projectId !== projectId) {
      throw new AgentAuthError('projectId does not match authenticated project');
    }

    assertEventAllowed(clientConfig, eventId);
    await assertAgentQuota(clientId, clientConfig);

    const limits = resolveClientLimits(clientConfig);
    sessionId = providedSessionId || `${clientId}:vc-${eventId}-${randomUUID()}`;
    const abortSignal = createAgentAbortSignal(limits.timeoutMs);

    const promptParts = [
      `Client: ${clientId}`,
      `Project: ${projectId}`,
      `Coordinator goal: ${goal}`,
      `Event ID: ${eventId}`,
      '',
      'Execute the full volunteer coordination workflow. Use tools in sequence.',
      'End with a concise summary for the human coordinator.',
    ];
    if (clientConfig.systemPromptAppend) {
      promptParts.push('', 'CLIENT NOTES:', clientConfig.systemPromptAppend);
    }
    const userPrompt = promptParts.join('\n');

    await upsertSessionIndex({
      sessionId,
      clientId,
      projectId,
      eventId,
      goal,
      userId: authContext.userId,
      phase: 'intake',
    });

    logAgentEvent({
      severity: 'INFO',
      event: 'agent_run_started',
      message: 'Volunteer coordinator run started',
      clientId,
      projectId,
      sessionId,
      eventId,
      userId: authContext.userId,
      authMethod: authContext.method,
    });

    const chat = volunteerCoordinatorAgent.chat({ sessionId });
    const response = await chat.send(userPrompt, { abortSignal });

    const reasoningTrace = buildReasoningTrace(response.messages);
    const toolRequestCount = response.toolRequests.length;
    const interrupts = response.interrupts.map((i) => ({
      toolName: i.name,
      input: i.input,
    }));

    const phase = response.state?.phase || 'intake';
    const usageRaw = (response.raw as {
      usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
    }).usage;
    const inputTokens = usageRaw?.inputTokens;
    const outputTokens = usageRaw?.outputTokens;
    const estimatedCostUsd = estimateRunCostUsd(inputTokens || 0, outputTokens || 0);

    const { perRunCapExceeded, ...usageCounters } = await recordAgentUsage(
      clientId,
      clientConfig,
      estimatedCostUsd,
    );

    if (perRunCapExceeded) {
      logAgentEvent({
        severity: 'WARNING',
        event: 'agent_run_cost_warning',
        message: 'Run exceeded configured per-run cost threshold',
        clientId,
        projectId,
        sessionId,
        costUsd: estimatedCostUsd,
        meta: { limit: limits.maxCostUsdPerRun },
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
      clientId,
      projectId,
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
      usageSummary: usageCounters,
      evaluation,
      finishReason: response.finishReason,
    };

    payload.runLogId = await logAgentRun({
      agentName: 'volunteerCoordinator',
      sessionId: payload.sessionId,
      eventId,
      goal,
      clientId,
      projectId,
      userId: authContext.userId,
      authMethod: authContext.method,
      durationMs: Date.now() - startedAt,
      status: 'success',
      finishReason: response.finishReason,
      summary: response.text,
      reasoningTrace,
      usage: payload.usage,
      evaluation,
    });

    await upsertSessionIndex({
      sessionId: payload.sessionId,
      clientId,
      projectId,
      eventId,
      goal,
      userId: authContext.userId,
      phase,
    });

    logAgentEvent({
      severity: 'INFO',
      event: 'agent_run_completed',
      message: 'Volunteer coordinator run completed',
      clientId,
      projectId,
      sessionId: payload.sessionId,
      eventId,
      userId: authContext.userId,
      authMethod: authContext.method,
      durationMs: Date.now() - startedAt,
      costUsd: estimatedCostUsd,
      meta: {
        finishReason: response.finishReason,
        toolRequestCount,
        evaluationScore: evaluation.score,
      },
    });

    return payload;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    if (abortSignalLikeTimedOut(err)) {
      throw new AgentTimeoutError(`Agent run exceeded ${AGENT_LIMITS.timeoutMs}ms`);
    }

    if (
      parsedInput &&
      authContext &&
      !(err instanceof AgentAuthError) &&
      !(err instanceof AgentValidationError) &&
      !(err instanceof AgentRateLimitError) &&
      !(err instanceof AgentCostLimitError)
    ) {
      await logAgentRunFailure({
        agentName: 'volunteerCoordinator',
        sessionId: sessionId || 'unknown',
        eventId: parsedInput.eventId,
        goal: parsedInput.goal,
        clientId: authContext.clientId,
        projectId: authContext.projectId,
        userId: authContext.userId,
        authMethod: authContext.method,
        durationMs,
        error: errorMessage,
      });
    }

    logAgentEvent({
      severity: 'ERROR',
      event: 'agent_run_failed',
      message: errorMessage,
      clientId: authContext?.clientId,
      projectId: authContext?.projectId,
      sessionId: sessionId || undefined,
      eventId: parsedInput?.eventId,
      userId: authContext?.userId,
      authMethod: authContext?.method,
      durationMs,
      error: errorMessage,
    });

    throw err;
  }
}

function abortSignalLikeTimedOut(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === 'AbortError' || /aborted|timeout/i.test(err.message);
}
