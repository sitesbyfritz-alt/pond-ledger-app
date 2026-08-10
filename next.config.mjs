/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// PWA is a production-only concern. Importing @ducanh2912/next-pwa eagerly pulls
// in workbox-webpack-plugin at config-load time, so we only load it for prod
// builds — dev never touches that dependency tree.
const isDev = process.env.NODE_ENV === "development";

let config = nextConfig;
if (!isDev) {
  const withPWAInit = (await import("@ducanh2912/next-pwa")).default;
  const withPWA = withPWAInit({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    workboxOptions: {
      disableDevLogs: true,
    },
  });
  config = withPWA(nextConfig);
}

export default config;
