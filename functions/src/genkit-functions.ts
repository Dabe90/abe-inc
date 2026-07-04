import { onCallGenkit } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { helloGenkitFlow } from './genkit/src/flows/hello-flow.js';

export { onInquiryCreated } from './on-inquiry-created.js';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

const callableOptions = {
  secrets: [geminiApiKey],
  cors: ['https://abestack.com', 'http://localhost:3456', 'http://127.0.0.1:3456'],
};

/** Smoke-test Genkit flow — enable by exporting from index.ts after secret is set. */
export const helloGenkit = onCallGenkit(callableOptions, helloGenkitFlow);
