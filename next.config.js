/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  // Performance optimizations for mobile
  compress: true,
  poweredByHeader: false,
  // Image optimization
  images: {
    domains: ['images.unsplash.com'],
    formats: ['image/webp'],
  },
};

module.exports = nextConfig;