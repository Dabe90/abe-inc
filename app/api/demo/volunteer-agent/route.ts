import { NextRequest, NextResponse } from 'next/server';
import {
  runDemoVolunteerAgent,
  DemoRateLimitError,
  DemoValidationError,
} from '../../../../src/demo/run-demo-volunteer-agent';

export const runtime = 'nodejs';
export const maxDuration = 60;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * POST /api/demo/volunteer-agent
 * Safe public demo — sample roster only, rate limited, no API key required.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await runDemoVolunteerAgent(body, { ip: clientIp(req) });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Demo-Mode': 'true',
        'X-Demo-Disclaimer': result.disclaimer,
      },
    });
  } catch (err) {
    if (err instanceof DemoValidationError) {
      return NextResponse.json({ ok: false, error: err.message, demoMode: true }, { status: 400 });
    }
    if (err instanceof DemoRateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, demoMode: true }, { status: 429 });
    }

    console.error('[demo/volunteer-agent]', err);
    return NextResponse.json(
      {
        ok: false,
        demoMode: true,
        error: err instanceof Error ? err.message : 'Demo agent failed',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    demoMode: true,
    disclaimer: 'Demo mode — fictional data only',
    endpoint: '/api/volunteer-agent-demo',
    method: 'POST',
    stream: 'Add ?stream=1 or body.stream:true for NDJSON reasoning steps',
    body: { goal: 'string (min 10 chars)', eventId: 'optional — uses demo data' },
  });
}
