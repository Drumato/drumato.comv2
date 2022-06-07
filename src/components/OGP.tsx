import Head from "next/head";

type OGPProps = {
  cardType: "website" | "article";
  title: string;
  description: string;
  url: string;
  siteName: string;
  imageLink: string;
  articleAuthorURL?: string;
};

const OGP = (props: OGPProps): JSX.Element => {
  return (
    <Head>
      <meta property="og:type" content={props.cardType} />
      <meta property="og:title" content={props.title} />
      <meta property="og:description" content={props.description} />
      <meta property="og:url" content={props.url} />
      <meta property="og:site_name" content={props.siteName} />
      <meta property="og:image" content={props.imageLink} />
      {props.articleAuthorURL && (
        <meta property="article:author" content={props.articleAuthorURL} />
      )}
    </Head>
  );
};
export default OGP;
