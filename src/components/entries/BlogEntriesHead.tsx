import Head from "next/head";

type BlogEntriesHeadProps = {
  title: string;
  link: string;
};

const BlogEntriesHead = (props: BlogEntriesHeadProps): JSX.Element => {
  const imageLink = "/Drumato.png";
  return (
    <Head>
      <title>{props.title}</title>
      <meta property="og:type" content="website" />
      <meta property="og:title" content={props.title} />
      <meta property="og:description" content={props.title} />
      <meta property="og:url" content={props.link} />
      <meta property="og:site_name" content="drumato.com" />
      <meta
        property="article:author"
        content="https://www.facebook.com/drumato.yamato.sugawara"
      />
      <meta property="og:image" content={imageLink} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:site" content="drumato" />
    </Head>
  );
};

export default BlogEntriesHead;
