import { BottomNavigationAction } from "@mui/material";
import { FacebookIcon, FacebookShareButton } from "next-share";

type Props = {
  url: string;
};

const FacebookShare = (props: Props): JSX.Element => {
  return (
    <FacebookShareButton url={props.url}>
      <BottomNavigationAction
        label="Share on Facebook"
        icon={<FacebookIcon round size={32} style={{ fontSize: "large" }} />}
      />
    </FacebookShareButton>
  );
};

export default FacebookShare;
