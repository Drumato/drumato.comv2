import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import TwitterShare from "./TwitterShare";
import FacebookShare from "./FacebookShare";
import PocketShare from "./PocketShare";
import HatenaShare from "./HatenaShare";
import useLocale from "~/hooks/useLocale";

type Props = {
  title: string;
  createdAt: string;
  entryType: "post" | "diary";
  id: string;
};

const CreatedAt = (props: { createdAt: string }): JSX.Element => {
  return (
    <BottomNavigationAction
      label={`created at ${props.createdAt}`}
      icon={<EditIcon style={{ fontSize: "large" }} />}
    />
  );
};

const BlogEntryNavigation = (props: Props): JSX.Element => {
  const { rawLocale } = useLocale();
  const entryLink = `https://www.drumato.com/${rawLocale}/${props.entryType}/${props.id}`;

  return (
    <BottomNavigation showLabels>
      <CreatedAt createdAt={props.createdAt} />
      <FacebookShare url={entryLink} />
      <TwitterShare url={entryLink} title={props.title} />
      <PocketShare url={entryLink} title={props.title} />
      <HatenaShare url={entryLink} title={props.title} />
    </BottomNavigation>
  );
};
export default BlogEntryNavigation;
