import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { triageInquiryFlow } from './genkit/src/flows/triage-inquiry.js';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

export const onInquiryCreated = onDocumentCreated(
  {
    document: 'inquiry_queue/{inquiryId}',
    secrets: [geminiApiKey],
    maxInstances: 5,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (data.triageSummary || data.status === 'triaged') return;

    const name = String(data.name || '');
    const email = String(data.email || '');
    const service = String(data.service || '');
    const message = String(data.message || '');

    if (!message) return;

    try {
      const triage = await triageInquiryFlow({ name, email, service, message });

      await snap.ref.update({
        status: 'triaged',
        triageSummary: triage.summary,
        triageCategory: triage.category,
        triageUrgency: triage.urgency,
        recommendAudit: triage.recommendAudit,
        triagedAt: FieldValue.serverTimestamp(),
      });

      await getFirestore().collection('inquiry_triage_log').add({
        inquiryId: snap.id,
        ...triage,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('[onInquiryCreated]', err);
      await snap.ref.update({
        status: 'triage_failed',
        triageError: err instanceof Error ? err.message : 'Unknown error',
        triagedAt: FieldValue.serverTimestamp(),
      });
    }
  },
);
