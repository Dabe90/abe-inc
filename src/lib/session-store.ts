import { FirestoreSessionStore } from '@genkit-ai/firebase/beta';
import { getApps, initializeApp } from 'firebase-admin/app';
import type { FirestoreSessionStoreOptions } from '@genkit-ai/firebase/beta';

let store: FirestoreSessionStore | undefined;

function ensureFirebaseApp() {
  if (!getApps().length) {
    initializeApp();
  }
}

/** Shared Firestore-backed session store for multi-turn agents. */
export function getAgentSessionStore<S = unknown>(
  opts: FirestoreSessionStoreOptions = {},
): FirestoreSessionStore<S> {
  ensureFirebaseApp();
  if (!store) {
    store = new FirestoreSessionStore<S>({
      collection: 'agent_sessions',
      checkpointInterval: 1,
      ...opts,
    });
  }
  return store as FirestoreSessionStore<S>;
}
