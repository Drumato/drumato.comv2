import Head from "next/head";

type TwitterCardProps = {
  userID: string;
  cardContent: "summary" | "summary_large_image";
};
const TwitterCard = (props: TwitterCardProps): JSX.Element => {
  return (
    <Head>
      <meta name="twitter:card" content={props.cardContent} />
      <meta name="twitter:site" content={props.userID} />
    </Head>
  );
};
export default TwitterCard;
