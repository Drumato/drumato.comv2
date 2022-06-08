import { BottomNavigationAction } from "@mui/material";
import { PocketIcon, PocketShareButton } from "next-share";

type Props = {
  url: string;
  title: string;
};

const PocketShare = (props: Props): JSX.Element => {
  return (
    <PocketShareButton url={props.url} title={props.title}>
      <BottomNavigationAction
        label="Share on Pocket"
        icon={<PocketIcon round size={32} style={{ fontSize: "large" }} />}
      />
    </PocketShareButton>
  );
};
export default PocketShare;
