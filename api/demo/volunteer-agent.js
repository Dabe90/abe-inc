const DEMO_DISCLAIMER = 'Demo mode — not real client data';

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function setDemoHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://abestack.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Demo-Mode', 'true');
  res.setHeader('X-Demo-Disclaimer', DEMO_DISCLAIMER);
}

/** Vercel serverless — safe Genkit demo (sample data only). */
export default async function handler(req, res) {
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
      endpoint: '/api/demo/volunteer-agent',
      method: 'POST',
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed', demoMode: true });
    return;
  }

  try {
    const { runDemoVolunteerAgent } = await import('../../src/demo/run-demo-volunteer-agent.js');
    const result = await runDemoVolunteerAgent(req.body, { ip: clientIp(req) });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  } catch (err) {
    const name = err && err.name;
    if (name === 'DemoValidationError') {
      res.status(400).json({ ok: false, error: err.message, demoMode: true });
      return;
    }
    if (name === 'DemoRateLimitError') {
      res.status(429).json({ ok: false, error: err.message, demoMode: true });
      return;
    }

    console.error('[api/demo/volunteer-agent]', err);
    res.status(500).json({
      ok: false,
      demoMode: true,
      error: err instanceof Error ? err.message : 'Demo agent failed',
    });
  }
}
