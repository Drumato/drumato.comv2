import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";

const Home: NextPageWithLayout<{}> = (): JSX.Element => {
  return <></>;
};

Home.getLayout = (page) => {
  return <MainLayout containerWidth="lg">{page}</MainLayout>;
};

export default Home;
