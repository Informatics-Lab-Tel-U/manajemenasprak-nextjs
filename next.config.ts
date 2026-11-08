import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const isDockerBuild = process.env.DOCKER_BUILD === 'true';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Produces a self-contained Node.js server when building for Docker.
  // Not set for CF Workers (opennextjs-cloudflare) builds.
  ...(isDockerBuild && { output: 'standalone' }),
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(exceljs|xlsx|file-saver|papaparse|csv-parser|capsize-font-metrics\.json)$/,
        })
      );
    }
    return config;
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@tiptap/react',
      '@stepperize/react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
};

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default analyzer(nextConfig);
