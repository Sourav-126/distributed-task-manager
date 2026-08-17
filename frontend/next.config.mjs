/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['localhost:3000', 'moody-mangos-stay.loca.lt', '*.loca.lt', '*.pinggy.link', '*.pinggy.io', '*.trycloudflare.com'],
  async rewrites() {
    return [
      {
        source: '/api/signin',
        destination: 'http://localhost:1443/signin',
      },
      {
        source: '/api/signup',
        destination: 'http://localhost:1443/signup',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:1443/api/:path*',
      },
      {
        source: '/ws/:path*',
        destination: 'http://localhost:1443/ws/:path*',
      },
    ];
  },
};

export default nextConfig;
