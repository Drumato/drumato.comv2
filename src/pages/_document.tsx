import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";
import HeadTitle from "~/components/HeadTitle";

const GoogleFontDOM = (): JSX.Element => {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" />
    </>
  );
};
const FaviconDOM = (): JSX.Element => {
  return (
    <>
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/favicons/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicons/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicons/favicon-16x16.png"
      />
      <link rel="manifest" href="/favicons/site.webmanifest" />
      <link
        rel="mask-icon"
        href="/favicons/safari-pinned-tab.svg"
        color="#5bbad5"
      />
      <meta name="msapplication-TileColor" content="#da532c" />
      <meta name="theme-color" content="#ffffff" />
    </>
  );
};

const MyDocument = () => {
  const googleAnalyticsID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? "";
  return (
    <Html>
      <Head>
        <HeadTitle />
        <GoogleFontDOM />
        <link
          href="https://fonts.googleapis.com/css2?family=Klee+One&family=M+PLUS+1p&family=Noto+Sans+JP&display=swap"
          rel="stylesheet"
        />
        <FaviconDOM />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${googleAnalyticsID}');
          `}
        </Script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
};

export default MyDocument;
