import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  runDemoVolunteerAgent,
  DemoRateLimitError,
  DemoValidationError,
  DEMO_DISCLAIMER,
} from '../../src/demo/run-demo-volunteer-agent.js';

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/** Vercel serverless entry — works alongside static HTML on abestack.com */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'https://abestack.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Demo-Mode', 'true');
  res.setHeader('X-Demo-Disclaimer', DEMO_DISCLAIMER);

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
    const result = await runDemoVolunteerAgent(req.body, { ip: clientIp(req) });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof DemoValidationError) {
      res.status(400).json({ ok: false, error: err.message, demoMode: true });
      return;
    }
    if (err instanceof DemoRateLimitError) {
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
