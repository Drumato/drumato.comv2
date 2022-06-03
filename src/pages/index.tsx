import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";

const Home: NextPageWithLayout = () => {
  return <>WIP</>;
};

Home.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default Home;
