import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const ALLOWED_ORIGINS = ['https://abestack.com', 'http://localhost:3456', 'http://127.0.0.1:3456'];

function setCors(req: { headers: { origin?: string } }, res: { set: (key: string, value: string) => void }) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

type InquiryPayload = {
  name?: string;
  email?: string;
  service?: string;
  message?: string;
  _honey?: string;
};

export const submitInquiry = onRequest({ cors: false, maxInstances: 10 }, async (req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const body = (req.body || {}) as InquiryPayload;

  if (body._honey) {
    res.status(200).json({ ok: true });
    return;
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const service = String(body.service || '').trim();
  const message = String(body.message || '').trim();

  if (!name || !email || !message) {
    res.status(400).json({ ok: false, error: 'Missing required fields' });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ ok: false, error: 'Invalid email' });
    return;
  }

  const db = getFirestore();
  const docRef = await db.collection('inquiry_queue').add({
    name,
    email,
    service: service || 'Not specified',
    message,
    status: 'new',
    source: 'abestack.com',
    reviewRequired: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  res.status(200).json({ ok: true, id: docRef.id });
});
