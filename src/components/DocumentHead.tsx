import Head from "next/head";
import Favicons from "./Favicons";

type Props = {};

const GoogleFont = (): JSX.Element => {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" />
    </>
  );
};

const DocumentHead = (_props: Props): JSX.Element => {
  return (
    <Head>
      <title>drumato.com</title>
      <GoogleFont />
      <Favicons />
    </Head>
  );
};

export default DocumentHead;
