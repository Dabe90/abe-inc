import { initializeApp } from 'firebase-admin/app';

initializeApp();

/** Contact form endpoint — no Gemini secret required. */
export { submitInquiry } from './submit-inquiry.js';

/**
 * Genkit flows (helloGenkit, onInquiryCreated) live in ./genkit-functions.ts.
 * After setting the secret, uncomment the line below and redeploy:
 *
 *   firebase functions:secrets:set GEMINI_API_KEY
 *   export { helloGenkit, onInquiryCreated } from './genkit-functions.js';
 */
