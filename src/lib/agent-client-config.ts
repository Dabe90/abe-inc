import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { AGENT_LIMITS, AgentValidationError } from './production-controls.js';

export type AgentClientConfig = {
  clientId: string;
  projectId: string;
  displayName: string;
  enabled: boolean;
  /** Empty = any eventId allowed for this client. */
  allowedEventIds: string[];
  model: string;
  maxTurns: number;
  maxOutputTokens: number;
  maxCostUsdPerRun: number;
  rateLimitPerHour: number;
  rateLimitPerDay: number;
  dailyCostBudgetUsd: number;
  systemPromptAppend?: string;
  apiKeyHash?: string;
};

const DEFAULT_DEMO_CLIENT: AgentClientConfig = {
  clientId: 'demo',
  projectId: 'prayer-city',
  displayName: 'Abe Stack Live Demo',
  enabled: true,
  allowedEventIds: [],
  model: 'gemini-2.5-flash',
  maxTurns: AGENT_LIMITS.maxTurns,
  maxOutputTokens: AGENT_LIMITS.maxOutputTokens,
  maxCostUsdPerRun: AGENT_LIMITS.maxEstimatedCostUsd,
  rateLimitPerHour: 20,
  rateLimitPerDay: 100,
  dailyCostBudgetUsd: 5,
  systemPromptAppend:
    'This is the public Abe Stack demo. Keep responses concise and safe for a marketing site.',
};

const configCache = new Map<string, { config: AgentClientConfig; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

function ensureApp() {
  if (!getApps().length) initializeApp();
}

function normalizeConfig(raw: FirebaseFirestore.DocumentData, clientId: string): AgentClientConfig {
  return {
    clientId,
    projectId: String(raw.projectId || clientId),
    displayName: String(raw.displayName || clientId),
    enabled: raw.enabled !== false,
    allowedEventIds: Array.isArray(raw.allowedEventIds) ? raw.allowedEventIds.map(String) : [],
    model: String(raw.model || DEFAULT_DEMO_CLIENT.model),
    maxTurns: Number(raw.maxTurns ?? DEFAULT_DEMO_CLIENT.maxTurns),
    maxOutputTokens: Number(raw.maxOutputTokens ?? DEFAULT_DEMO_CLIENT.maxOutputTokens),
    maxCostUsdPerRun: Number(raw.maxCostUsdPerRun ?? DEFAULT_DEMO_CLIENT.maxCostUsdPerRun),
    rateLimitPerHour: Number(raw.rateLimitPerHour ?? DEFAULT_DEMO_CLIENT.rateLimitPerHour),
    rateLimitPerDay: Number(raw.rateLimitPerDay ?? DEFAULT_DEMO_CLIENT.rateLimitPerDay),
    dailyCostBudgetUsd: Number(raw.dailyCostBudgetUsd ?? DEFAULT_DEMO_CLIENT.dailyCostBudgetUsd),
    systemPromptAppend: raw.systemPromptAppend ? String(raw.systemPromptAppend) : undefined,
    apiKeyHash: raw.apiKeyHash ? String(raw.apiKeyHash) : undefined,
  };
}

export async function getAgentClientConfig(clientId: string): Promise<AgentClientConfig> {
  const cached = configCache.get(clientId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config;
  }

  if (clientId === 'demo') {
    configCache.set(clientId, { config: DEFAULT_DEMO_CLIENT, expiresAt: Date.now() + CACHE_TTL_MS });
    return DEFAULT_DEMO_CLIENT;
  }

  try {
    ensureApp();
    const snap = await getFirestore().collection('agent_clients').doc(clientId).get();
    if (!snap.exists) {
      const fallback = { ...DEFAULT_DEMO_CLIENT, clientId, projectId: clientId };
      configCache.set(clientId, { config: fallback, expiresAt: Date.now() + CACHE_TTL_MS });
      return fallback;
    }
    const config = normalizeConfig(snap.data() || {}, clientId);
    configCache.set(clientId, { config, expiresAt: Date.now() + CACHE_TTL_MS });
    return config;
  } catch (err) {
    console.warn('[getAgentClientConfig] Firestore unavailable, using defaults', { clientId, err });
    const fallback = clientId === 'demo'
      ? DEFAULT_DEMO_CLIENT
      : { ...DEFAULT_DEMO_CLIENT, clientId, projectId: clientId };
    return fallback;
  }
}

export async function findClientByApiKeyHash(apiKeyHash: string): Promise<AgentClientConfig | null> {
  try {
    ensureApp();
    const snap = await getFirestore()
      .collection('agent_clients')
      .where('apiKeyHash', '==', apiKeyHash)
      .where('enabled', '==', true)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return normalizeConfig(doc.data(), doc.id);
  } catch (err) {
    console.warn('[findClientByApiKeyHash] lookup failed', err);
    return null;
  }
}

export function assertEventAllowed(clientConfig: AgentClientConfig, eventId: string): void {
  if (!clientConfig.allowedEventIds.length) return;
  if (!clientConfig.allowedEventIds.includes(eventId)) {
    throw new AgentValidationError(
      `Event "${eventId}" is not allowed for client "${clientConfig.clientId}"`,
    );
  }
}

export function resolveClientLimits(clientConfig: AgentClientConfig) {
  return {
    timeoutMs: AGENT_LIMITS.timeoutMs,
    maxTurns: Math.min(clientConfig.maxTurns, AGENT_LIMITS.maxTurns),
    maxOutputTokens: Math.min(clientConfig.maxOutputTokens, AGENT_LIMITS.maxOutputTokens),
    maxCostUsdPerRun: Math.min(clientConfig.maxCostUsdPerRun, AGENT_LIMITS.maxEstimatedCostUsd),
    rateLimitPerHour: clientConfig.rateLimitPerHour,
    rateLimitPerDay: clientConfig.rateLimitPerDay,
    dailyCostBudgetUsd: clientConfig.dailyCostBudgetUsd,
  };
}
