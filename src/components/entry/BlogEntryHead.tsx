import Head from "next/head";

type BlogEntryHeadProps = {
  entryName: string;
  description: string;
  entryCategory: "post" | "diary";
  id: string;
  imageLink: string;
};

const BlogEntryHead = (props: BlogEntryHeadProps): JSX.Element => {
  return (
    <Head>
      <title>{props.entryName}</title>
      <meta property="og:type" content="article" />
      <meta property="og:title" content={props.entryName} />
      <meta property="og:description" content={props.description} />
      <meta property="og:url" content={`/${props.entryCategory}/${props.id}`} />
      <meta property="og:site_name" content="drumato.com" />
      <meta
        property="article:author"
        content="https://www.facebook.com/drumato.yamato.sugawara"
      />
      <meta property="og:image" content={props.imageLink} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="drumato" />
    </Head>
  );
};

export default BlogEntryHead;
