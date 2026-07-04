/**
 * Seed per-client agent configuration in Firestore.
 *
 * Usage:
 *   node scripts/seed-agent-clients.mjs
 *   node scripts/seed-agent-clients.mjs --api-key "your-client-key"
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or Firebase CLI login.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const apiKeyArg = process.argv.find((arg, i) => process.argv[i - 1] === '--api-key');
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const firebaseRc = JSON.parse(readFileSync(join(rootDir, '.firebaserc'), 'utf8'));
const projectId = process.env.GOOGLE_CLOUD_PROJECT || firebaseRc.projects?.default;

if (!projectId) {
  console.error('Missing Firebase project ID. Set GOOGLE_CLOUD_PROJECT or configure .firebaserc');
  process.exit(1);
}

initializeApp({ projectId, credential: applicationDefault() });
const db = getFirestore();

const clients = [
  {
    id: 'demo',
    data: {
      clientId: 'demo',
      projectId: 'prayer-city',
      displayName: 'Abe Stack Live Demo',
      enabled: true,
      allowedEventIds: ['prayer-city-july-2026'],
      model: 'gemini-2.5-flash',
      maxTurns: 10,
      maxOutputTokens: 2048,
      maxCostUsdPerRun: 0.15,
      rateLimitPerHour: 20,
      rateLimitPerDay: 100,
      dailyCostBudgetUsd: 5,
      systemPromptAppend:
        'This is the public Abe Stack demo. Keep responses concise and safe for a marketing site.',
      updatedAt: FieldValue.serverTimestamp(),
    },
  },
  {
    id: 'prayer-city',
    data: {
      clientId: 'prayer-city',
      projectId: 'prayer-city',
      displayName: 'Prayer City Volunteer Ops',
      enabled: true,
      allowedEventIds: [],
      model: 'gemini-2.5-flash',
      maxTurns: 12,
      maxOutputTokens: 4096,
      maxCostUsdPerRun: 0.35,
      rateLimitPerHour: 60,
      rateLimitPerDay: 500,
      dailyCostBudgetUsd: 25,
      systemPromptAppend:
        'Prayer City serve-day coordinator. Prioritize greeter and kids ministry coverage.',
      updatedAt: FieldValue.serverTimestamp(),
    },
  },
];

for (const client of clients) {
  const payload = { ...client.data };
  if (apiKeyArg && client.id !== 'demo') {
    payload.apiKeyHash = createHash('sha256').update(apiKeyArg).digest('hex');
  }
  await db.collection('agent_clients').doc(client.id).set(payload, { merge: true });
  console.log(`Seeded agent_clients/${client.id}`);
}

console.log('Done. Demo client uses AGENT_API_KEY secret; other clients use apiKeyHash in Firestore.');
