// @ts-check

/**
 * @type {import('next').NextConfig}
 **/
const nextConfig = {
  reactStrictMode: true,
  incremental: true,
  optimizeFonts: true,
  i18n: {
    locales: ["en", "ja"],
    defaultLocale: "en",
  },
};

module.exports = nextConfig;
