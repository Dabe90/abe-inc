/**
 * Local dev entry — run with: npm run genkit:dev
 * Opens Genkit Developer UI at http://localhost:4000
 */
import { config as loadEnv } from 'dotenv';

loadEnv();

const geminiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY;

if (!geminiKey) {
  console.error(
    [
      '',
      'Genkit needs a Gemini API key before agents and flows can load.',
      '  1. Copy .env.example to .env',
      '  2. Set GEMINI_API_KEY from https://aistudio.google.com/apikey',
      '  3. Run npm run genkit:dev again',
      '',
    ].join('\n')
  );
} else {
  await import('./flows/hello-flow.js');
  await import('./flows/triage-inquiry.js');
  await import('./agents/ops-assistant.js');
  await import('./agents/volunteer-coordinator.js');
  await import('./evaluators/volunteer-coordinator-quality.js');
}
