import Head from "next/head";
import OGP from "~/components/OGP";
import TwitterCard from "~/components/TwitterCard";
import GoogleAnalytics from "~/components/GoogleAnalytics";
import Favicons from "../Favicons";

type BlogEntryHeadProps = {
  entryName: string;
  description: string;
  entryCategory: "post" | "diary";
  id: string;
  imageLink: string;
};

const BlogEntryHead = (props: BlogEntryHeadProps): JSX.Element => {
  const url = `/${props.entryCategory}/${props.id}`;
  const siteName = "drumato.com";
  const facebookURL = "https://www.facebook.com/drumato.yamato.sugawara";

  return (
    <Head>
      <title>{props.entryName}</title>
      <GoogleAnalytics />
      <Favicons />
      <OGP
        cardType="article"
        title={props.entryName}
        description={props.description}
        url={url}
        siteName={siteName}
        articleAuthorURL={facebookURL}
        imageLink={props.imageLink}
      />
      <TwitterCard userID="drumato" cardContent="summary_large_image" />
    </Head>
  );
};

export default BlogEntryHead;
