/**
 * Central Genkit configuration — Abe Stack agentic AI layer.
 *
 * @see https://firebase-genkit.mintlify.app/plugins/google-genai
 * @see https://genkit.dev/docs/js/deployment/firebase/
 */
import { config as loadEnv } from 'dotenv';
import { genkit } from 'genkit/beta';
import { googleAI } from '@genkit-ai/google-genai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

loadEnv();

/** Default Gemini model for agents and flows (2026 best practice: 2.5 Flash). */
export const DEFAULT_GEMINI_MODEL = googleAI.model('gemini-2.5-flash');

/**
 * Shared Genkit instance — import `ai` from this file in agents, tools, and flows.
 * Uses genkit/beta for defineAgent and other agent APIs.
 */
export const ai = genkit({
  plugins: [
    googleAI(),
    // Production on GCP: add vertexAI({ location: 'us-central1' }) alongside googleAI()
  ],
  model: DEFAULT_GEMINI_MODEL,
});

/** Enable Genkit Monitoring when running on Firebase (set GENKIT_ENABLE_TELEMETRY=true). */
export async function initFirebaseTelemetry(): Promise<void> {
  if (process.env.GENKIT_ENABLE_TELEMETRY === 'true') {
    await enableFirebaseTelemetry();
  }
}

export default ai;
