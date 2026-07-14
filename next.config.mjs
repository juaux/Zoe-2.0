/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Ignora erros de ESLint/Prettier durante o build da Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Necessário para bcrypt nativo funcionar na Vercel
  serverExternalPackages: ['bcrypt'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pztsxinbspcmrolsbkwk.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  compress: true,

  onDemandEntries: { maxInactiveAge: 15000, pagesBufferLength: 2 },

  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devtool = 'eval-cheap-module-source-map';
    }
    return config;
  },
};

export default nextConfig;
