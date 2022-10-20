/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  optimizeFonts: true,
  i18n: {
    locales: ["en", "ja"],
    defaultLocale: "en",
  },
};

module.exports = nextConfig;
