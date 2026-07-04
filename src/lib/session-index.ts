import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';

export type SessionIndexEntry = {
  sessionId: string;
  clientId: string;
  projectId: string;
  eventId: string;
  goal: string;
  userId?: string;
  phase?: string;
};

function ensureApp() {
  if (!getApps().length) initializeApp();
}

/** Index session metadata for per-client history (Genkit store holds conversation state). */
export async function upsertSessionIndex(entry: SessionIndexEntry): Promise<void> {
  try {
    ensureApp();
    await getFirestore()
      .collection('agent_session_index')
      .doc(entry.sessionId)
      .set(
        {
          ...entry,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (err) {
    console.warn('[upsertSessionIndex]', err);
  }
}
