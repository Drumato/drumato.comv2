import { TwitterIcon, TwitterShareButton } from "next-share";

type Props = {
  url: string;
  title: string;
};

const TwitterShare = (props: Props): JSX.Element => {
  return (
    <TwitterShareButton url={props.url} title={props.title}>
      <TwitterIcon round size={32} style={{ fontSize: "large" }} />
    </TwitterShareButton>
  );
};

export default TwitterShare;
