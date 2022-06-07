import OGP from "~/components/OGP";
import TwitterCard from "~/components/TwitterCard";
import Favicons from "../Favicons";
import GoogleAnalytics from "../GoogleAnalytics";

type BlogEntriesHeadProps = {
  title: string;
  link: string;
};

const BlogEntriesHead = (props: BlogEntriesHeadProps): JSX.Element => {
  const imageLink = "/Drumato.png";
  const siteName = "drumato.com";
  const facebookURL = "https://www.facebook.com/drumato.yamato.sugawara";
  return (
    <>
      <meta name="viewport" content="width=device-width,initial-scale=1.0" />
      <title>{props.title}</title>
      <GoogleAnalytics />
      <Favicons />
      <OGP
        cardType="website"
        title={props.title}
        description={props.title}
        url={props.link}
        siteName={siteName}
        articleAuthorURL={facebookURL}
        imageLink={imageLink}
      />
      <TwitterCard
        userID="drumato"
        cardContent="summary"
        title={props.title}
        description={props.title}
      />
    </>
  );
};

export default BlogEntriesHead;
