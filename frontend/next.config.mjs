/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NEXT_EXPORT === 'true' ? 'export' : 'standalone',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
