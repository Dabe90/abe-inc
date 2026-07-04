/** Production guardrails for agent HTTP handlers. */
export const AGENT_LIMITS = {
  /** Wall-clock timeout for a single coordinator run (ms). */
  timeoutMs: Number(process.env.AGENT_TIMEOUT_MS || 55_000),
  /** Max model turns per invocation (also set on agent maxTurns). */
  maxTurns: Number(process.env.AGENT_MAX_TURNS || 10),
  /** Per-generation output token cap. */
  maxOutputTokens: Number(process.env.AGENT_MAX_OUTPUT_TOKENS || 2048),
  /** Rough USD alert threshold per run (logging only). */
  maxEstimatedCostUsd: Number(process.env.AGENT_MAX_COST_USD || 0.15),
} as const;

export function createAgentAbortSignal(timeoutMs = AGENT_LIMITS.timeoutMs): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export function assertAgentApiKey(authHeader: string | null | undefined): void {
  const expected = process.env.AGENT_API_KEY;
  if (!expected) return;
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (token !== expected) {
    throw new AgentAuthError('Unauthorized');
  }
}

export class AgentAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentAuthError';
  }
}

export class AgentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentValidationError';
  }
}

export class AgentTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentTimeoutError';
  }
}

/** Very rough Gemini Flash cost estimate for logging/alerts (not billing). */
export function estimateRunCostUsd(inputTokens: number, outputTokens: number): number {
  const inputRate = 0.00000015;
  const outputRate = 0.0000006;
  return inputTokens * inputRate + outputTokens * outputRate;
}
