import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';

export type AgentLogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export type AgentLogEvent = {
  severity: AgentLogSeverity;
  event: string;
  message: string;
  clientId?: string;
  projectId?: string;
  sessionId?: string;
  eventId?: string;
  userId?: string;
  authMethod?: string;
  durationMs?: number;
  costUsd?: number;
  error?: string;
  meta?: Record<string, unknown>;
};

function ensureApp() {
  if (!getApps().length) initializeApp();
}

/** Structured JSON for Google Cloud Logging + optional Firestore audit trail. */
export function logAgentEvent(entry: AgentLogEvent): void {
  const payload = {
    ...entry,
    service: 'abe-stack-agent',
    timestamp: new Date().toISOString(),
  };

  const line = JSON.stringify(payload);
  if (entry.severity === 'ERROR') {
    console.error(line);
  } else if (entry.severity === 'WARNING') {
    console.warn(line);
  } else {
    console.info(line);
  }

  if (process.env.AGENT_AUDIT_LOG_TO_FIRESTORE === 'true' || entry.severity === 'ERROR') {
    writeAuditLog(entry).catch((err) => {
      console.error(JSON.stringify({ severity: 'ERROR', event: 'audit_log_failed', error: String(err) }));
    });
  }
}

async function writeAuditLog(entry: AgentLogEvent): Promise<void> {
  ensureApp();
  await getFirestore().collection('agent_audit_log').add({
    ...entry,
    createdAt: FieldValue.serverTimestamp(),
  });
}
