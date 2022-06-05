import { Html, Head, Main, NextScript } from "next/document";
import Link from "next/link";

const MyDocument = () => {
  return (
    <Html>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Klee+One&family=M+PLUS+1p&family=Noto+Sans+JP&display=swap"
          rel="stylesheet"
        ></link>
        <></>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
};
export default MyDocument;
