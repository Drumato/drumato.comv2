type TwitterCardProps = {
  userID: string;
  cardContent: "summary" | "summary_large_image";
};
const TwitterCard = (props: TwitterCardProps): JSX.Element => {
  return (
    <>
      <meta name="twitter:card" content={props.cardContent} />
      <meta name="twitter:site" content={props.userID} />
    </>
  );
};
export default TwitterCard;
