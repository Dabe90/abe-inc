import { createHash } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp } from 'firebase-admin/app';
import { AgentAuthError } from './production-controls.js';
import { findClientByApiKeyHash, getAgentClientConfig, type AgentClientConfig } from './agent-client-config.js';

export type AgentAuthContext = {
  method: 'firebase' | 'api_key';
  clientId: string;
  projectId: string;
  userId?: string;
  email?: string;
  clientConfig: AgentClientConfig;
};

function ensureApp() {
  if (!getApps().length) initializeApp();
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

function looksLikeJwt(token: string): boolean {
  return token.split('.').length === 3;
}

async function verifyFirebaseToken(token: string): Promise<AgentAuthContext> {
  ensureApp();
  const decoded = await getAuth().verifyIdToken(token);

  const clientId =
    (typeof decoded.clientId === 'string' && decoded.clientId) ||
    (typeof decoded.tenantId === 'string' && decoded.tenantId) ||
    'default';

  const clientConfig = await getAgentClientConfig(clientId);
  if (!clientConfig.enabled) {
    throw new AgentAuthError('Client account is disabled');
  }

  return {
    method: 'firebase',
    clientId: clientConfig.clientId,
    projectId: clientConfig.projectId,
    userId: decoded.uid,
    email: decoded.email,
    clientConfig,
  };
}

async function verifyApiKey(token: string): Promise<AgentAuthContext> {
  const globalKey = process.env.AGENT_API_KEY;
  if (globalKey && token === globalKey) {
    const clientConfig = await getAgentClientConfig('demo');
    if (!clientConfig.enabled) {
      throw new AgentAuthError('Demo client is disabled');
    }
    return {
      method: 'api_key',
      clientId: clientConfig.clientId,
      projectId: clientConfig.projectId,
      clientConfig,
    };
  }

  const clientConfig = await findClientByApiKeyHash(hashApiKey(token));
  if (!clientConfig) {
    throw new AgentAuthError('Unauthorized');
  }

  return {
    method: 'api_key',
    clientId: clientConfig.clientId,
    projectId: clientConfig.projectId,
    clientConfig,
  };
}

/**
 * Resolve caller identity from Authorization: Bearer <firebase-id-token | api-key>.
 * Firebase Auth is preferred for production clients; shared AGENT_API_KEY maps to demo client.
 */
export async function resolveAgentAuth(
  authHeader: string | null | undefined,
): Promise<AgentAuthContext> {
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    throw new AgentAuthError('Missing Authorization header');
  }

  if (looksLikeJwt(token)) {
    try {
      return await verifyFirebaseToken(token);
    } catch (err) {
      if (err instanceof AgentAuthError) throw err;
      throw new AgentAuthError('Invalid Firebase ID token');
    }
  }

  return verifyApiKey(token);
}

/** Skip auth when AGENT_API_KEY is unset (local dev only). */
export async function resolveAgentAuthOptional(
  authHeader: string | null | undefined,
): Promise<AgentAuthContext> {
  if (!process.env.AGENT_API_KEY && !authHeader) {
    const clientConfig = await getAgentClientConfig('demo');
    return {
      method: 'api_key',
      clientId: clientConfig.clientId,
      projectId: clientConfig.projectId,
      clientConfig,
    };
  }
  return resolveAgentAuth(authHeader);
}
