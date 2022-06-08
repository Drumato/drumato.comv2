import OGP from "~/components/OGP";
import TwitterCard from "~/components/TwitterCard";
import GoogleAnalytics from "~/components/GoogleAnalytics";
import Favicons from "../Favicons";
import { entryContentPath, EntryKind } from "~/utils/siteLink";
import useLocale from "~/hooks/useLocale";

type BlogEntryHeadProps = {
  entryName: string;
  description: string;
  entryKind: EntryKind;
  id: string;
  imageLink: string;
};

const BlogEntryHead = (props: BlogEntryHeadProps): JSX.Element => {
  const { rawLocale } = useLocale();
  const path = entryContentPath(rawLocale, props.entryKind, props.id);
  const siteName = "drumato.com";
  const facebookURL = "https://www.facebook.com/drumato.yamato.sugawara";

  return (
    <>
      <title>{props.entryName}</title>
      <GoogleAnalytics />
      <Favicons />
      <OGP
        cardType="article"
        title={props.entryName}
        description={props.description}
        url={path}
        siteName={siteName}
        articleAuthorURL={facebookURL}
        imageLink={props.imageLink}
      />
      <TwitterCard
        userID="drumato"
        cardContent="summary_large_image"
        title={props.entryName}
        description={props.description}
        imageLink={props.imageLink}
      />
    </>
  );
};

export default BlogEntryHead;
