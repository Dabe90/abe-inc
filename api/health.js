/** Minimal health check — verifies Vercel serverless routing. */
export default function handler(_req, res) {
  res.status(200).json({ ok: true, service: 'abe-stack' });
}
