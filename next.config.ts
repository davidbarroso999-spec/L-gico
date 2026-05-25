import type {NextConfig} from 'next';
import path from 'path';
import { createRequire } from 'module';

// Patch Node module loader to resolve browserslist, node-releases, and caniuse-lite
// relative to our local project dependencies to avoid corrupted global packages.
try {
  const relativeRequire = createRequire(process.cwd() + '/next.config.ts');
  const Module = require('module');
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
    if (
      request === 'browserslist' || 
      request === 'node-releases' || 
      request.startsWith('node-releases/') ||
      request === 'caniuse-lite' ||
      request.startsWith('caniuse-lite/')
    ) {
      try {
        return relativeRequire.resolve(request);
      } catch (err) {
        // Fallback to original resolver
      }
    }
    return originalResolveFilename.apply(this, arguments);
  };
} catch (e) {
  console.warn('Failed to apply Module resolution patch:', e);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@google/genai'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    if (!config.resolve.modules) {
      config.resolve.modules = [];
    }
    config.resolve.modules.push(path.resolve(process.cwd(), 'node_modules'), 'node_modules');

    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
