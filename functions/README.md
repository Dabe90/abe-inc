# Genkit + Firebase Functions

Agentic AI source lives at the repo root:

- `genkit.config.ts` — shared Genkit instance, Gemini 2.5 Flash default
- `src/agents/` — agent definitions
- `src/tools/` — tool-calling helpers
- `src/flows/` — deployable flows (hello, triage)

## Local dev

```bash
cp .env.example .env
# Add GEMINI_API_KEY from https://aistudio.google.com/apikey

npm run genkit:dev
```

Opens **Genkit Developer UI** at http://localhost:4000

## Deploy to Firebase

See **`docs/SETUP-GUIDE.md`** for the full checklist.

Quick version:

1. `cp .firebaserc.example .firebaserc` → set your project ID
2. `firebase login` and `firebase use <project-id>`
3. Enable Firestore in Firebase Console
4. `firebase functions:secrets:set GEMINI_API_KEY`
5. `cd functions && npm install && npm run deploy`

### Deployed functions

| Export | Type | Purpose |
|--------|------|---------|
| `submitInquiry` | HTTP | Contact form → Firestore `inquiry_queue` |
| `onInquiryCreated` | Firestore trigger | Genkit triage on new inquiries |
| `helloGenkit` | Callable | Smoke-test Genkit flow |

After deploy, set `formEndpoint` in `js/config.js` to your `submitInquiry` URL.

Build copies root Genkit sources into `functions/src/genkit/` automatically via `prebuild`.
