const AppleTouchFavicon = (): JSX.Element => {
  return (
    <link
      rel="apple-touch-icon"
      sizes="180x180"
      href="/favicons/apple-touch-icon.png"
    />
  );
};

const Favicon32PixelSquare = (): JSX.Element => {
  return (
    <link
      rel="icon"
      type="image/png"
      sizes="16x16"
      href="/favicons/favicon-16x16.png"
    />
  );
};
const Favicon16PixelSquare = (): JSX.Element => {
  return (
    <link
      rel="icon"
      type="image/png"
      sizes="32x32"
      href="/favicons/favicon-32x32.png"
    />
  );
};

const SafariPinnedTabFavicon = (): JSX.Element => {
  return (
    <link
      rel="mask-icon"
      href="/favicons/safari-pinned-tab.svg"
      color="#5bbad5"
    />
  );
};

const Favicons = (): JSX.Element => {
  return (
    <>
      <AppleTouchFavicon />
      <Favicon32PixelSquare />
      <Favicon16PixelSquare />
      <SafariPinnedTabFavicon />
      <link rel="manifest" href="/favicons/site.webmanifest" />
      <meta name="msapplication-TileColor" content="#da532c" />
      <meta name="theme-color" content="#ffffff" />
    </>
  );
};

export default Favicons;
