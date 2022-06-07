import Head from "next/head";
import OGP from "~/components/OGP";
import TwitterCard from "~/components/TwitterCard";

type BlogEntriesHeadProps = {
  title: string;
  link: string;
};

const BlogEntriesHead = (props: BlogEntriesHeadProps): JSX.Element => {
  const imageLink = "/Drumato.png";
  const siteName = "drumato.com";
  const facebookURL = "https://www.facebook.com/drumato.yamato.sugawara";
  return (
    <Head>
      <title>{props.title}</title>
      <OGP
        cardType="website"
        title={props.title}
        description={props.title}
        url={props.link}
        siteName={siteName}
        articleAuthorURL={facebookURL}
        imageLink={imageLink}
      />
      <TwitterCard userID="drumato" cardContent="summary" />
    </Head>
  );
};

export default BlogEntriesHead;
