const DEMO_DISCLAIMER = 'Demo mode — not real client data';
const DEMO_EVENT_ID = 'demo-serve-day-2026';

const ROSTER = {
  volunteers: [
    { id: 'demo-v1', name: 'Alex R.', skills: ['greeter', 'spanish'] },
    { id: 'demo-v2', name: 'Jordan M.', skills: ['logistics', 'driving'] },
    { id: 'demo-v3', name: 'Sam T.', skills: ['kids', 'first-aid'] },
  ],
  openShifts: [
    { id: 'demo-s1', title: 'Welcome desk' },
    { id: 'demo-s2', title: 'Parking & logistics' },
    { id: 'demo-s3', title: 'Kids ministry helper' },
  ],
};

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

const buckets = new Map();
const HOURLY_LIMIT = Number(process.env.DEMO_AGENT_RATE_LIMIT || 12);

function assertRateLimit(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { remaining: HOURLY_LIMIT - 1, resetAt: now + windowMs };
  }
  if (existing.count >= HOURLY_LIMIT) {
    const err = new Error(`Demo rate limit reached (${HOURLY_LIMIT} runs per hour). Try again later.`);
    err.name = 'DemoRateLimitError';
    throw err;
  }
  existing.count += 1;
  return { remaining: HOURLY_LIMIT - existing.count, resetAt: existing.resetAt };
}

function buildMockResponse(goal) {
  const sessionId = `demo-${Date.now()}`;
  const wantsSpanish = /spanish|bilingual|greeter/i.test(goal);
  const match1 = wantsSpanish ? 'Alex R.' : 'Riley K.';
  const match2 = 'Jordan M.';

  const reasoningTrace = [
    {
      step: 1,
      type: 'reasoning',
      content: 'Parsing coordinator goal and confirming this is a demo event with fictional roster data.',
    },
    {
      step: 2,
      type: 'tool_request',
      toolName: 'demoGetEventRoster',
      content: JSON.stringify({ eventId: DEMO_EVENT_ID }),
    },
    {
      step: 3,
      type: 'tool_response',
      toolName: 'demoGetEventRoster',
      content: JSON.stringify({ ...ROSTER, source: 'demo', volunteerCount: 3, openShiftCount: 3 }),
    },
    {
      step: 4,
      type: 'tool_request',
      toolName: 'demoProposeVolunteerMatches',
      content: JSON.stringify({
        matches: [
          { volunteerName: match1, shiftTitle: 'Welcome desk', confidence: 'high' },
          { volunteerName: match2, shiftTitle: 'Parking & logistics', confidence: 'high' },
        ],
      }),
    },
    {
      step: 5,
      type: 'tool_response',
      toolName: 'demoProposeVolunteerMatches',
      content: JSON.stringify({ proposalId: `demo_prop_${Date.now()}`, status: 'pending_human_review' }),
    },
    {
      step: 6,
      type: 'tool_request',
      toolName: 'demoQueueCoordinatorAction',
      content: JSON.stringify({ actionType: 'send_digest', summary: 'Coordinator digest for demo matches' }),
    },
    {
      step: 7,
      type: 'tool_response',
      toolName: 'demoQueueCoordinatorAction',
      content: JSON.stringify({ actionId: `demo_action_${Date.now()}`, reviewRequired: true }),
    },
  ];

  const summary = [
    `Demo coordinator run for ${DEMO_EVENT_ID}.`,
    `Proposed ${match1} → Welcome desk and ${match2} → Parking & logistics`,
    wantsSpanish ? '(prioritized Spanish-speaking greeter skills).' : '.',
    'Digest queued for human approval — nothing was sent automatically.',
  ].join(' ');

  return {
    ok: true,
    demoMode: true,
    disclaimer: DEMO_DISCLAIMER,
    sessionId,
    clientId: 'demo',
    projectId: 'demo',
    result: {
      summary,
      phase: 'queued',
      reasoning: '',
      toolRequestCount: 3,
      pendingHumanActions: ['Coordinator digest awaiting approval'],
    },
    finalActions: [
      {
        actionId: `demo_action_${Date.now()}`,
        actionType: 'send_digest',
        summary: 'Email digest with proposed shift matches (demo — not sent)',
        status: 'pending_human_review',
      },
    ],
    reasoningTrace,
    usage: { inputTokens: 420, outputTokens: 380, estimatedCostUsd: 0.0003 },
    evaluation: { score: 0.82, passed: true, notes: 'Demo simulation passed quality checks.' },
    finishReason: 'stop',
  };
}

async function runDemo(body, ip) {
  const goal = String(body?.goal || '').trim();
  if (goal.length < 10) {
    const err = new Error('String must contain at least 10 character(s)');
    err.name = 'DemoValidationError';
    throw err;
  }

  const rateLimit = assertRateLimit(ip);
  return { ...buildMockResponse(goal), rateLimit, poweredBy: 'Genkit-style demo simulator' };
}

function setDemoHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://abestack.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Demo-Mode', 'true');
  res.setHeader('X-Demo-Disclaimer', DEMO_DISCLAIMER);
}

module.exports = async function handler(req, res) {
  setDemoHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      ok: true,
      demoMode: true,
      disclaimer: DEMO_DISCLAIMER,
      endpoint: '/api/volunteer-agent-demo',
      method: 'POST',
      genkit: false,
      note: 'Production Genkit agent available via npm run next:dev',
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed', demoMode: true });
    return;
  }

  try {
    const result = await runDemo(req.body, clientIp(req));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  } catch (err) {
    if (err.name === 'DemoValidationError') {
      res.status(400).json({ ok: false, error: err.message, demoMode: true });
      return;
    }
    if (err.name === 'DemoRateLimitError') {
      res.status(429).json({ ok: false, error: err.message, demoMode: true });
      return;
    }
    console.error('[api/volunteer-agent-demo]', err);
    res.status(500).json({
      ok: false,
      demoMode: true,
      error: err instanceof Error ? err.message : 'Demo agent failed',
    });
  }
};
