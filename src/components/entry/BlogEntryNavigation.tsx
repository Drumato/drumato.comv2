import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

type Props = {
  title: string;
  createdAt: string;
  url: string;
};

const BlogEntryNavigation = (props: Props): JSX.Element => {
  return (
    <BottomNavigation showLabels>
      <BottomNavigationAction
        label={`created at ${props.createdAt}`}
        icon={<EditIcon style={{ fontSize: "large" }} />}
      />
    </BottomNavigation>
  );
};

export default BlogEntryNavigation;
