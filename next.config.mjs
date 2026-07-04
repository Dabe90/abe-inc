/** @type {import('next').NextConfig} */
const nextConfig = {
  // API routes only — static marketing site continues to deploy from root via Vercel.
  experimental: {
    serverComponentsExternalPackages: [
      'genkit',
      '@genkit-ai/firebase',
      '@genkit-ai/google-genai',
      '@genkit-ai/google-cloud',
      'firebase-admin',
    ],
  },
};

export default nextConfig;
