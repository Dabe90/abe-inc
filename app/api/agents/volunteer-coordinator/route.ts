import { NextRequest, NextResponse } from 'next/server';
import {
  runVolunteerCoordinator,
  AgentAuthError,
  AgentTimeoutError,
  AgentValidationError,
} from '../../../../src/handlers/volunteer-coordinator-handler.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/agents/volunteer-coordinator
 * Body: { goal: string, eventId: string, sessionId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await runVolunteerCoordinator(body, {
      authorizationHeader: req.headers.get('authorization'),
    });

    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof AgentAuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    if (err instanceof AgentValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    if (err instanceof AgentTimeoutError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 504 });
    }

    console.error('[volunteer-coordinator API]', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
