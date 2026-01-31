/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure CSS is processed correctly
  transpilePackages: [],
  // Output standalone for Vercel
  output: 'standalone',
}

module.exports = nextConfig
