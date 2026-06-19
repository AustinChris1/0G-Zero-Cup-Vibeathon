/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The 0G SDKs are optional and loaded via dynamic import at runtime only.
  // Mark them external so the bundler never tries to resolve them at build time.
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      "@0glabs/0g-serving-broker": "commonjs @0glabs/0g-serving-broker",
      "@0gfoundation/0g-ts-sdk": "commonjs @0gfoundation/0g-ts-sdk",
    });
    return config;
  },
};

export default nextConfig;
