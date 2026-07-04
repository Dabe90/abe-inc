/** Lightweight in-memory rate limiter for the public demo API (per IP, hourly). */

const HOURLY_LIMIT = Number(process.env.DEMO_AGENT_RATE_LIMIT || 12);
const WINDOW_MS = 60 * 60 * 1000;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export class DemoRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoRateLimitError';
  }
}

export function assertDemoRateLimit(ip: string): { remaining: number; resetAt: number } {
  const key = ip || 'unknown';
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { remaining: HOURLY_LIMIT - 1, resetAt: now + WINDOW_MS };
  }

  if (existing.count >= HOURLY_LIMIT) {
    throw new DemoRateLimitError(
      `Demo rate limit reached (${HOURLY_LIMIT} runs per hour). Try again later.`,
    );
  }

  existing.count += 1;
  return { remaining: HOURLY_LIMIT - existing.count, resetAt: existing.resetAt };
}

export function getDemoRateLimitConfig() {
  return { hourlyLimit: HOURLY_LIMIT, windowMs: WINDOW_MS };
}
