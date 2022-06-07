import Head from "next/head";

type TwitterCardProps = {
  userID: string;
  cardContent: "summary" | "summary_large_image";
  title: string;
  description: string;
};

const TwitterCard = (props: TwitterCardProps): JSX.Element => {
  return (
    <Head>
      <meta name="twitter:card" content={props.cardContent} />
      <meta name="twitter:site" content={`${props.userID}`} />
      <meta name="twitter:creator" content={`${props.userID}`} />
      <meta name="twitter:title" content={props.title} />
      <meta name="twitter:description" content={props.description} />
    </Head>
  );
};
export default TwitterCard;
