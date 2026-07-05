/**
 * Production-safe Volunteer Coordinator demo (Vercel serverless).
 * Genkit-style simulator with fictional roster - no GEMINI_API_KEY on this route.
 * JSON POST default; add ?stream=1 for NDJSON trace + complete payload.
 */
const DEMO_DISCLAIMER = 'Demo mode - fictional data only';
const DEMO_EVENT_ID = 'demo-serve-day-2026';

const buckets = new Map();
const HOURLY_LIMIT = Number(process.env.DEMO_AGENT_RATE_LIMIT || 12);

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
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

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function wantsStream(req, body) {
  if (body && body.stream === true) return true;
  const q = req.query || {};
  return q.stream === '1' || q.stream === 'true';
}

/** Short excerpt of the coordinator goal for the reasoning trace */
function excerptGoal(goal, maxLen) {
  const g = String(goal).replace(/\s+/g, ' ').trim();
  if (g.length <= maxLen) return g;
  return g.slice(0, maxLen - 1) + '\u2026';
}

/**
 * Fictional shift rules — first match per shift wins (order = priority).
 * Production demo only; not a live LLM or real roster.
 */
const DEMO_MATCH_RULES = [
  { theme: 'Bilingual greeters', patterns: /spanish|bilingual|espa\u00f1ol|habla/i, volunteer: 'Alex R.', shift: 'Welcome desk', reason: 'Spanish + greeter skills on roster' },
  { theme: 'Welcome & check-in', patterns: /welcome|greeter|front desk|check.?in|greet/i, volunteer: 'Riley K.', shift: 'Welcome desk', reason: 'Greeter experience and setup' },
  { theme: 'Parking & traffic', patterns: /parking|lot|traffic|shuttle|valet|logistics/i, volunteer: 'Jordan M.', shift: 'Parking and logistics', reason: 'Logistics lead + driving on file' },
  { theme: 'Kids ministry', patterns: /kids|children|nursery|youth|ministry|toddler|childcare/i, volunteer: 'Sam T.', shift: 'Kids ministry helper', reason: 'Background check + kids safety cert' },
  { theme: 'Setup & staging', patterns: /setup|set.?up|tear.?down|staging|breakdown|chairs|tables/i, volunteer: 'Casey L.', shift: 'Setup crew', reason: 'Staging and teardown experience' },
  { theme: 'First aid', patterns: /first.?aid|medical|cpr|emt|nurse|health|safety/i, volunteer: 'Morgan P.', shift: 'First aid station', reason: 'CPR / first-aid certified' },
  { theme: 'Hospitality & food', patterns: /food|snack|coffee|hospitality|catering|meal|refreshment/i, volunteer: 'Jamie W.', shift: 'Hospitality / snacks', reason: 'Food service + hospitality team' },
  { theme: 'Tech & AV', patterns: /tech|sound|audio|av|livestream|stream|slides|propresenter|camera/i, volunteer: 'Taylor N.', shift: 'Tech booth', reason: 'AV and livestream experience' },
  { theme: 'Prayer room', patterns: /prayer|intercession|praying/i, volunteer: 'Priya D.', shift: 'Prayer room', reason: 'Intercession team coordinator' },
  { theme: 'Ushers & seating', patterns: /usher|seating|crowd|overflow|escort/i, volunteer: 'Chris H.', shift: 'Ushers', reason: 'Crowd flow and seating' },
];

/** Pick volunteer matches from goal keywords; defaults when nothing specific matches */
function detectMatches(goal) {
  const seenShifts = {};
  const themes = [];
  const matches = [];

  DEMO_MATCH_RULES.forEach(function (rule) {
    if (!rule.patterns.test(goal)) return;
    if (seenShifts[rule.shift]) return;
    seenShifts[rule.shift] = true;
    themes.push(rule.theme);
    matches.push({ volunteer: rule.volunteer, shift: rule.shift, reason: rule.reason });
  });

  if (!matches.length) {
    themes.push('General serve day');
    matches.push(
      { volunteer: 'Riley K.', shift: 'Welcome desk', reason: 'Available greeter — default demo match' },
      { volunteer: 'Jordan M.', shift: 'Parking and logistics', reason: 'Available logistics — default demo match' }
    );
  }

  return { matches: matches.slice(0, 3), themes: themes };
}

function buildMockResponse(goal) {
  const sessionId = 'demo-' + Date.now();
  const parsed = detectMatches(goal);
  const matches = parsed.matches;
  const themes = parsed.themes;
  const goalEcho = excerptGoal(goal, 100);
  const volunteerCount = 10 + matches.length;
  const openShiftCount = 6 + matches.length;
  const matchCount = matches.length;
  const evalScore = Math.min(0.94, 0.84 + matchCount * 0.03 + (themes.length > 1 ? 0.02 : 0));

  const matchSummary = matches
    .map(function (m) {
      return m.volunteer + ' for ' + m.shift;
    })
    .join('; ');

  const reasoningTrace = [
    { step: 1, type: 'reasoning', content: 'Parsing goal: "' + goalEcho + '". Themes detected: ' + themes.join(', ') + '. Fictional roster only.' },
    { step: 2, type: 'tool_request', toolName: 'getEventRoster', content: JSON.stringify({ eventId: DEMO_EVENT_ID, focus: themes }) },
    { step: 3, type: 'tool_response', toolName: 'getEventRoster', content: JSON.stringify({ volunteerCount: volunteerCount, openShiftCount: openShiftCount }) },
    { step: 4, type: 'tool_request', toolName: 'proposeMatches', content: JSON.stringify({ proposed: matchCount, themes: themes }) },
    { step: 5, type: 'tool_response', toolName: 'proposeMatches', content: JSON.stringify({ matches: matches, status: 'pending_human_review' }) },
    { step: 6, type: 'tool_request', toolName: 'queueAction', content: JSON.stringify({ actionType: 'send_digest', autoSend: false }) },
    { step: 7, type: 'tool_response', toolName: 'queueAction', content: JSON.stringify({ queued: true, reviewRequired: true }) },
  ];

  const summary = [
    'Demo run for ' + DEMO_EVENT_ID + ' — ' + themes.join(' + ') + '.',
    'Proposed: ' + matchSummary + '.',
    'Digest queued for human approval. Nothing was sent automatically.',
  ].join(' ');

  const finalActions = matches.map(function (m, idx) {
    return {
      actionId: 'demo_match_' + (idx + 1) + '_' + Date.now(),
      actionType: 'propose_match',
      summary: m.volunteer + ' -> ' + m.shift,
      status: 'pending_human_review',
    };
  });
  finalActions.push({
    actionId: 'demo_digest_' + Date.now(),
    actionType: 'queue_digest',
    summary: 'Email digest with ' + matchCount + ' proposed shift match(es) (demo - not sent)',
    status: 'pending_human_review',
  });

  return {
    ok: true,
    demoMode: true,
    disclaimer: DEMO_DISCLAIMER,
    sessionId: sessionId,
    clientId: 'demo',
    projectId: 'demo',
    result: {
      summary: summary,
      goalEcho: goalEcho,
      detectedThemes: themes,
      phase: 'queued',
      reasoning: '',
      toolRequestCount: 3,
      pendingHumanActions: [
        matchCount + ' shift match(es) pending review',
        'Coordinator digest awaiting approval',
      ],
      proposedMatches: matches,
    },
    finalActions: finalActions,
    reasoningTrace: reasoningTrace,
    usage: {
      inputTokens: 380 + goal.length * 2,
      outputTokens: 280 + matchCount * 45,
      estimatedCostUsd: 0.0003 + matchCount * 0.00005,
    },
    evaluation: {
      score: evalScore,
      passed: true,
      notes: 'Demo simulation matched ' + matchCount + ' shift(s) from goal keywords.',
    },
    finishReason: 'stop',
    poweredBy: 'Genkit-style demo simulator',
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
  return Object.assign(buildMockResponse(goal), { rateLimit: rateLimit });
}

function setDemoHeaders(res, origin) {
  var allowed = 'https://abestack.com';
  if (origin && /^https?:\/\/(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|abestack\.com)/.test(origin)) {
    allowed = origin;
  }
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('X-Demo-Mode', 'true');
  res.setHeader('X-Demo-Disclaimer', DEMO_DISCLAIMER);
}

function streamDemoResponse(res, body, ip) {
  var result = runDemo(body, ip);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  var i;
  for (i = 0; i < result.reasoningTrace.length; i++) {
    res.write(JSON.stringify({ type: 'trace', step: result.reasoningTrace[i] }) + '\n');
  }
  res.write(JSON.stringify({ type: 'complete', data: result }) + '\n');
  res.end();
}

module.exports = function handler(req, res) {
  var origin = (req.headers && req.headers.origin) || '';
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
      stream: 'Add ?stream=1 or body.stream:true for NDJSON steps',
      keywords: 'Try goals mentioning spanish, kids, parking, tech, first aid, setup, prayer, or food',
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed', demoMode: true });
    return;
  }

  try {
    var body = parseBody(req);
    var ip = clientIp(req);

    if (wantsStream(req, body)) {
      streamDemoResponse(res, body, ip);
      return;
    }

    var result = runDemo(body, ip);
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
