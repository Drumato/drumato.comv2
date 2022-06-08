import { BottomNavigationAction } from "@mui/material";
import { TwitterIcon, TwitterShareButton } from "next-share";

type Props = {
  url: string;
  title: string;
};

const TwitterShare = (props: Props): JSX.Element => {
  return (
    <TwitterShareButton url={props.url} title={props.title}>
      <BottomNavigationAction
        label="Share on Twitter"
        icon={<TwitterIcon round size={32} style={{ fontSize: "large" }} />}
      />
    </TwitterShareButton>
  );
};

export default TwitterShare;
