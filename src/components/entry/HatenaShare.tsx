import { HatenaIcon, HatenaShareButton } from "next-share";

type Props = {
  url: string;
  title: string;
};
const HatenaShare = (props: Props): JSX.Element => {
  return (
    <HatenaShareButton url={props.url} title={props.title}>
      <HatenaIcon round size={32} style={{ fontSize: "large" }} />
    </HatenaShareButton>
  );
};

export default HatenaShare;
