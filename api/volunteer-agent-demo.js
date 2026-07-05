/**
 * Production-safe Volunteer Coordinator demo API (Vercel serverless).
 * Genkit-style simulator with fictional roster — no GEMINI_API_KEY required.
 * Supports JSON (default) or NDJSON streaming (?stream=1 or body.stream: true).
 */
const DEMO_DISCLAIMER = 'Demo mode — fictional data only';
const DEMO_EVENT_ID = 'demo-serve-day-2026';

/** Fictional in-memory roster — not real client data */
const DEMO_ROSTER = {
  eventId: DEMO_EVENT_ID,
  volunteerCount: 12,
  openShiftCount: 8,
  volunteers: [
    { id: 'demo-v1', name: 'Alex R.', skills: ['greeter', 'spanish'], availability: 'Saturday AM' },
    { id: 'demo-v2', name: 'Jordan M.', skills: ['logistics', 'driving'], availability: 'Saturday AM' },
    { id: 'demo-v3', name: 'Sam T.', skills: ['kids', 'first-aid'], availability: 'Saturday PM' },
    { id: 'demo-v4', name: 'Riley K.', skills: ['greeter', 'setup'], availability: 'Saturday AM' },
  ],
  openShifts: [
    { id: 'demo-s1', title: 'Welcome desk', needs: ['greeter', 'spanish'] },
    { id: 'demo-s2', title: 'Parking and logistics', needs: ['logistics', 'driving'] },
    { id: 'demo-s3', title: 'Kids ministry helper', needs: ['kids'] },
  ],
};

const buckets = new Map();
const HOURLY_LIMIT = Number(process.env.DEMO_AGENT_RATE_LIMIT || 12);

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

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
    const err = new Error('Demo rate limit reached (' + HOURLY_LIMIT + ' runs per hour). Try again later.');
    err.name = 'DemoRateLimitError';
    throw err;
  }
  existing.count += 1;
  return { remaining: HOURLY_LIMIT - existing.count, resetAt: existing.resetAt };
}

function wantsStream(req, body) {
  if (body && body.stream === true) return true;
  const q = req.query || {};
  const val = q.stream;
  return val === '1' || val === 'true';
}

/** Parse POST body on Vercel (pre-parsed object or raw string). */
function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

function buildReasoningTrace(goal, matches) {
  return [
    {
      step: 1,
      type: 'reasoning',
      content:
        'Parsing coordinator goal against fictional demo roster for ' +
        DEMO_EVENT_ID +
        '. Human approval required before any outbound action.',
    },
    {
      step: 2,
      type: 'tool_request',
      toolName: 'getEventRoster',
      content: JSON.stringify({ eventId: DEMO_EVENT_ID, source: 'demo_firestore' }),
    },
    {
      step: 3,
      type: 'tool_response',
      toolName: 'getEventRoster',
      content: JSON.stringify({
        volunteerCount: DEMO_ROSTER.volunteerCount,
        openShiftCount: DEMO_ROSTER.openShiftCount,
        sample: DEMO_ROSTER.volunteers.slice(0, 3).map(function (v) {
          return v.name;
        }),
      }),
    },
    {
      step: 4,
      type: 'reasoning',
      content: goal.match(/spanish|bilingual|greeter/i)
        ? 'Prioritizing Spanish-speaking greeters for Welcome desk per goal.'
        : 'Ranking volunteers by skills and Saturday availability.',
    },
    {
      step: 5,
      type: 'tool_request',
      toolName: 'proposeMatches',
      content: JSON.stringify({ proposed: matches.length, status: 'draft' }),
    },
    {
      step: 6,
      type: 'tool_response',
      toolName: 'proposeMatches',
      content: JSON.stringify({ matches: matches, reviewRequired: true }),
    },
    {
      step: 7,
      type: 'tool_request',
      toolName: 'queueAction',
      content: JSON.stringify({ actionType: 'send_digest', autoSend: false }),
    },
    {
      step: 8,
      type: 'tool_response',
      toolName: 'queueAction',
      content: JSON.stringify({ queued: true, status: 'pending_human_review' }),
    },
  ];
}

function buildMockResponse(goal, rateLimit) {
  const sessionId = 'demo-' + Date.now();
  const wantsSpanish = /spanish|bilingual|greeter/i.test(goal);
  const match1 = wantsSpanish
    ? { volunteer: 'Alex R.', shift: 'Welcome desk', reason: 'Spanish greeter skills' }
    : { volunteer: 'Riley K.', shift: 'Welcome desk', reason: 'Greeter + setup experience' };
  const match2 = { volunteer: 'Jordan M.', shift: 'Parking and logistics', reason: 'Logistics + driving' };
  const matches = [match1, match2];

  const reasoningTrace = buildReasoningTrace(goal, matches);

  const summary = [
    'Demo coordinator run for ' + DEMO_EVENT_ID + '.',
    'Proposed ' + match1.volunteer + ' for ' + match1.shift + ' and ' + match2.volunteer + ' for ' + match2.shift + '.',
    wantsSpanish ? 'Prioritized Spanish-speaking greeter skills.' : '',
    'Digest queued for human approval — nothing sent automatically.',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    ok: true,
    demoMode: true,
    disclaimer: DEMO_DISCLAIMER,
    sessionId: sessionId,
    clientId: 'demo',
    projectId: 'demo',
    result: {
      summary: summary,
      phase: 'queued',
      reasoning: '',
      toolRequestCount: 3,
      pendingHumanActions: ['Coordinator digest awaiting approval', '2 shift matches pending review'],
      proposedMatches: matches,
    },
    finalActions: [
      {
        actionId: 'demo_match_' + Date.now() + '_1',
        actionType: 'propose_match',
        summary: match1.volunteer + ' → ' + match1.shift + ' (' + match1.reason + ')',
        status: 'pending_human_review',
      },
      {
        actionId: 'demo_match_' + Date.now() + '_2',
        actionType: 'propose_match',
        summary: match2.volunteer + ' → ' + match2.shift + ' (' + match2.reason + ')',
        status: 'pending_human_review',
      },
      {
        actionId: 'demo_digest_' + Date.now(),
        actionType: 'queue_digest',
        summary: 'Email digest with proposed shift matches — demo, not sent',
        status: 'pending_human_review',
      },
    ],
    reasoningTrace: reasoningTrace,
    usage: { inputTokens: 520, outputTokens: 410, estimatedCostUsd: 0.0004 },
    evaluation: { score: 0.86, passed: true, notes: 'Demo simulation passed quality checks.' },
    finishReason: 'stop',
    poweredBy: 'Genkit-style demo simulator',
    rateLimit: rateLimit,
  };
}

function runDemo(body, ip) {
  const goal = String((body && body.goal) || '').trim();
  if (goal.length < 10) {
    const err = new Error('Describe your goal in at least 10 characters.');
    err.name = 'DemoValidationError';
    throw err;
  }
  const rateLimit = assertRateLimit(ip);
  return buildMockResponse(goal, rateLimit);
}

function setDemoHeaders(res, origin) {
  const allowed =
    origin && /^https?:\/\/(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|abestack\.com)/.test(origin)
      ? origin
      : 'https://abestack.com';
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('X-Demo-Mode', 'true');
  res.setHeader('X-Demo-Disclaimer', DEMO_DISCLAIMER);
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function streamDemoResponse(res, body, ip) {
  const result = runDemo(body, ip);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  for (var i = 0; i < result.reasoningTrace.length; i++) {
    res.write(JSON.stringify({ type: 'trace', step: result.reasoningTrace[i] }) + '\n');
  }
  res.write(JSON.stringify({ type: 'complete', data: result }) + '\n');
  res.end();
}

module.exports = function handler(req, res) {
  const origin = req.headers.origin || '';
  setDemoHeaders(res, origin);

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
      stream: 'Add ?stream=1 or body.stream:true for NDJSON reasoning steps',
      body: { goal: 'string (min 10 chars)', eventId: 'optional — uses demo data' },
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed', demoMode: true });
    return;
  }

  try {
    const body = parseBody(req);
    const ip = clientIp(req);

    if (wantsStream(req, body)) {
      streamDemoResponse(res, body, ip);
      return;
    }

    const result = runDemo(body, ip);
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
    res.status(500).json({ ok: false, demoMode: true, error: err.message || 'Demo agent failed' });
  }
};
