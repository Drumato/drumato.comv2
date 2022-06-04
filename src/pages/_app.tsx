import { ReactNode } from "react";
import { AppPropsWithLayout, GetLayout } from "~/@types/NextPageWithLayout";
import "/public/styles.css";

const MyApp = ({ Component, pageProps }: AppPropsWithLayout<{}>): ReactNode => {
  const pageIdentity: GetLayout = (page) => page;
  const getLayout = Component.getLayout ?? pageIdentity;
  return getLayout(<Component {...pageProps} />);
};

export default MyApp;
