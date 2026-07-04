import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const geminiApiKey = defineSecret('GEMINI_API_KEY');
const agentApiKey = defineSecret('AGENT_API_KEY');

const ALLOWED_ORIGINS = [
  'https://abestack.com',
  'http://localhost:3000',
  'http://localhost:3456',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3456',
];

type HandlerModule = typeof import('./genkit/src/handlers/volunteer-coordinator-handler.js');

let handlerPromise: Promise<HandlerModule> | undefined;

/** Lazy-load Genkit (~15s cold import) so Cloud Run passes startup health checks. */
function loadHandler(): Promise<HandlerModule> {
  if (!handlerPromise) {
    handlerPromise = import('./genkit/src/handlers/volunteer-coordinator-handler.js');
  }
  return handlerPromise;
}

function setCors(req: { headers: { origin?: string } }, res: { set: (key: string, value: string) => void }) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function isAgentError(err: unknown, name: string): err is Error {
  return err instanceof Error && err.name === name;
}

/** POST { goal, eventId, sessionId?, clientId?, projectId? } — Volunteer Coordinator Agent (Genkit). */
export const volunteerCoordinator = onRequest(
  {
    cors: false,
    invoker: 'public',
    maxInstances: 5,
    timeoutSeconds: 120,
    memory: '1GiB',
    cpu: 1,
    secrets: [geminiApiKey, agentApiKey],
  },
  async (req, res) => {
    setCors(req, res);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    try {
      const { runVolunteerCoordinator } = await loadHandler();
      const authHeader =
        typeof req.headers.authorization === 'string' ? req.headers.authorization : null;

      const result = await runVolunteerCoordinator(req.body, {
        authorizationHeader: authHeader,
        requireAuth: true,
      });

      res.status(200).json(result);
    } catch (err) {
      if (isAgentError(err, 'AgentAuthError')) {
        res.status(401).json({ ok: false, error: err.message });
        return;
      }
      if (isAgentError(err, 'AgentValidationError')) {
        res.status(400).json({ ok: false, error: err.message });
        return;
      }
      if (isAgentError(err, 'AgentRateLimitError')) {
        res.status(429).json({ ok: false, error: err.message });
        return;
      }
      if (isAgentError(err, 'AgentCostLimitError')) {
        res.status(402).json({ ok: false, error: err.message });
        return;
      }
      if (isAgentError(err, 'AgentTimeoutError')) {
        res.status(504).json({ ok: false, error: err.message });
        return;
      }

      console.error('[volunteerCoordinator]', err);
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      });
    }
  },
);
