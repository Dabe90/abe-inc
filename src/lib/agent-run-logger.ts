import type { MessageData } from '@genkit-ai/ai';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';

export type ReasoningTraceStep = {
  step: number;
  type: 'text' | 'reasoning' | 'tool_request' | 'tool_response';
  content: string;
  toolName?: string;
};

export type AgentRunLog = {
  agentName: string;
  sessionId: string;
  eventId: string;
  goal: string;
  finishReason: string;
  summary: string;
  status: 'success' | 'error';
  clientId?: string;
  projectId?: string;
  userId?: string;
  authMethod?: string;
  durationMs?: number;
  reasoningTrace: ReasoningTraceStep[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd?: number;
  };
  evaluation?: {
    score: number;
    passed: boolean;
    notes: string;
  };
  error?: string;
  createdAt: ReturnType<typeof FieldValue.serverTimestamp>;
};

function ensureApp() {
  if (!getApps().length) initializeApp();
}

export function buildReasoningTrace(messages: MessageData[] = []): ReasoningTraceStep[] {
  const trace: ReasoningTraceStep[] = [];
  let step = 0;

  for (const message of messages) {
    for (const part of message.content || []) {
      step += 1;
      if ('text' in part && part.text) {
        trace.push({
          step,
          type: message.role === 'model' ? 'text' : 'text',
          content: part.text,
        });
      }
      if ('reasoning' in part && part.reasoning) {
        trace.push({ step, type: 'reasoning', content: String(part.reasoning) });
      }
      if ('toolRequest' in part && part.toolRequest) {
        trace.push({
          step,
          type: 'tool_request',
          toolName: part.toolRequest.name,
          content: JSON.stringify(part.toolRequest.input ?? {}),
        });
      }
      if ('toolResponse' in part && part.toolResponse) {
        trace.push({
          step,
          type: 'tool_response',
          toolName: part.toolResponse.name,
          content: JSON.stringify(part.toolResponse.output ?? {}),
        });
      }
    }
  }

  return trace;
}

export async function logAgentRun(entry: Omit<AgentRunLog, 'createdAt'>): Promise<string | undefined> {
  try {
    ensureApp();
    const ref = await getFirestore().collection('agent_runs').add({
      ...entry,
      createdAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('[logAgentRun]', err);
    return undefined;
  }
}

export async function logAgentRunFailure(
  entry: Omit<AgentRunLog, 'createdAt' | 'finishReason' | 'summary' | 'reasoningTrace' | 'status'> & {
    finishReason?: string;
    summary?: string;
    reasoningTrace?: ReasoningTraceStep[];
  },
): Promise<string | undefined> {
  return logAgentRun({
    ...entry,
    finishReason: entry.finishReason || 'failed',
    summary: entry.summary || '',
    reasoningTrace: entry.reasoningTrace || [],
    status: 'error',
  });
}
