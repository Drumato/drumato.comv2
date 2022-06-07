import { Html, Head, Main, NextScript } from "next/document";

const MyDocument = () => {
  // custom font must be added at the document top level.
  return (
    <Html>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Klee+One&family=M+PLUS+1p&family=Noto+Sans+JP&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
};

export default MyDocument;
