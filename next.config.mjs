/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-select', '@radix-ui/react-dropdown-menu'],
  },
};
export default nextConfig;
