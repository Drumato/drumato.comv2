import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import TwitterShare from "./TwitterShare";
import FacebookShare from "./FacebookShare";
import PocketShare from "./PocketShare";
import HatenaShare from "./HatenaShare";

type Props = {
  title: string;
  createdAt: string;
  url: string;
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
  return (
    <BottomNavigation showLabels>
      <CreatedAt createdAt={props.createdAt} />
      <FacebookShare url={props.url} />
      <TwitterShare url={props.url} title={props.title} />
      <PocketShare url={props.url} title={props.title} />
      <HatenaShare url={props.url} title={props.title} />
    </BottomNavigation>
  );
};
export default BlogEntryNavigation;
