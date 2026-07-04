import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { AgentCostLimitError, AgentRateLimitError } from './production-controls.js';
import type { AgentClientConfig } from './agent-client-config.js';

type UsageWindows = {
  hourStart: FirebaseFirestore.Timestamp;
  hourRequests: number;
  hourCostUsd: number;
  dayStart: FirebaseFirestore.Timestamp;
  dayRequests: number;
  dayCostUsd: number;
  lifetimeRequests: number;
  lifetimeCostUsd: number;
};

function ensureApp() {
  if (!getApps().length) initializeApp();
}

function hourBucket(date = new Date()): string {
  return date.toISOString().slice(0, 13);
}

function dayBucket(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function freshWindows(now: Date): UsageWindows {
  const ts = Timestamp.fromDate(now);
  return {
    hourStart: ts,
    hourRequests: 0,
    hourCostUsd: 0,
    dayStart: ts,
    dayRequests: 0,
    dayCostUsd: 0,
    lifetimeRequests: 0,
    lifetimeCostUsd: 0,
  };
}

function normalizeWindows(data: FirebaseFirestore.DocumentData | undefined, now: Date): UsageWindows {
  const base = freshWindows(now);
  if (!data) return base;

  const hourKey = hourBucket(now);
  const dayKey = dayBucket(now);
  const storedHourKey = String(data.hourKey || '');
  const storedDayKey = String(data.dayKey || '');

  return {
    hourStart: data.hourStart instanceof Timestamp ? data.hourStart : base.hourStart,
    hourRequests: storedHourKey === hourKey ? Number(data.hourRequests || 0) : 0,
    hourCostUsd: storedHourKey === hourKey ? Number(data.hourCostUsd || 0) : 0,
    dayStart: data.dayStart instanceof Timestamp ? data.dayStart : base.dayStart,
    dayRequests: storedDayKey === dayKey ? Number(data.dayRequests || 0) : 0,
    dayCostUsd: storedDayKey === dayKey ? Number(data.dayCostUsd || 0) : 0,
    lifetimeRequests: Number(data.lifetimeRequests || 0),
    lifetimeCostUsd: Number(data.lifetimeCostUsd || 0),
  };
}

function checkLimits(
  windows: UsageWindows,
  clientConfig: AgentClientConfig,
  projectedCostUsd: number,
): void {
  if (windows.hourRequests >= clientConfig.rateLimitPerHour) {
    throw new AgentRateLimitError(
      `Hourly limit reached (${clientConfig.rateLimitPerHour} requests/hour)`,
    );
  }
  if (windows.dayRequests >= clientConfig.rateLimitPerDay) {
    throw new AgentRateLimitError(
      `Daily request limit reached (${clientConfig.rateLimitPerDay} requests/day)`,
    );
  }
  if (windows.dayCostUsd + projectedCostUsd > clientConfig.dailyCostBudgetUsd) {
    throw new AgentCostLimitError(
      `Daily cost budget exceeded ($${clientConfig.dailyCostBudgetUsd.toFixed(2)}/day)`,
    );
  }
}

/** Check rate/cost budgets before an agent run. */
export async function assertAgentQuota(
  clientId: string,
  clientConfig: AgentClientConfig,
): Promise<void> {
  ensureApp();
  const db = getFirestore();
  const ref = db.collection('agent_usage').doc(clientId);
  const now = new Date();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const windows = normalizeWindows(snap.data(), now);
    checkLimits(windows, clientConfig, clientConfig.maxCostUsdPerRun);
  });
}

/** Record usage after a successful run. */
export async function recordAgentUsage(
  clientId: string,
  clientConfig: AgentClientConfig,
  costUsd: number,
): Promise<{
  hourRequests: number;
  dayRequests: number;
  dayCostUsd: number;
  perRunCapExceeded: boolean;
}> {
  ensureApp();
  const db = getFirestore();
  const ref = db.collection('agent_usage').doc(clientId);
  const now = new Date();
  const hourKey = hourBucket(now);
  const dayKey = dayBucket(now);
  const perRunCapExceeded = costUsd > clientConfig.maxCostUsdPerRun;

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const windows = normalizeWindows(snap.data(), now);

    const nextHourRequests = windows.hourRequests + 1;
    const nextDayRequests = windows.dayRequests + 1;
    const nextDayCostUsd = windows.dayCostUsd + costUsd;

    tx.set(
      ref,
      {
        clientId,
        hourKey,
        dayKey,
        hourStart: windows.hourStart,
        hourRequests: nextHourRequests,
        hourCostUsd: windows.hourCostUsd + costUsd,
        dayStart: windows.dayStart,
        dayRequests: nextDayRequests,
        dayCostUsd: nextDayCostUsd,
        lifetimeRequests: windows.lifetimeRequests + 1,
        lifetimeCostUsd: windows.lifetimeCostUsd + costUsd,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      hourRequests: nextHourRequests,
      dayRequests: nextDayRequests,
      dayCostUsd: nextDayCostUsd,
      perRunCapExceeded,
    };
  });
}
