import { Html, Head, Main, NextScript } from "next/document";
import Link from "next/link";

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
  return (
    <Html>
      <Head>
        <GoogleFontDOM />
        <link
          href="https://fonts.googleapis.com/css2?family=Klee+One&family=M+PLUS+1p&family=Noto+Sans+JP&display=swap"
          rel="stylesheet"
        />
        <FaviconDOM />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
};

export default MyDocument;
