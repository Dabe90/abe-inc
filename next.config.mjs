/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    tsconfigPath: 'tsconfig.next.json',
  },
  serverExternalPackages: [
    'genkit',
    '@genkit-ai/firebase',
    '@genkit-ai/google-genai',
    '@genkit-ai/google-cloud',
    'firebase-admin',
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
