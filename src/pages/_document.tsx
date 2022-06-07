import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";
import DocumentHead from "~/components/DocumentHead";

const MyDocument = () => {
  const googleAnalyticsID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? "";

  return (
    <Html>
      <DocumentHead />
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Klee+One&family=M+PLUS+1p&family=Noto+Sans+JP&display=swap"
          rel="stylesheet"
        />
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
