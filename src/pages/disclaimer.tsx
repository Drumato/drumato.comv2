import fs from "fs";
import { GetStaticProps } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { Markdown } from "~/components/Markdown";
import MainLayout from "~/layouts/MainLayout";

type DisclaimerProps = {
  content: string;
};

export const getStaticProps: GetStaticProps<DisclaimerProps> = async ({
  locale,
}) => {
  const filePath = `markdowns/${locale}/disclaimer.md`;
  const content: string = fs.readFileSync(filePath, "utf-8");

  return {
    props: {
      content: content,
    },
  };
};

const Disclaimer: NextPageWithLayout<DisclaimerProps> = ({
  content,
}: DisclaimerProps) => {
  return <Markdown content={content} />;
};

Disclaimer.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default Disclaimer;
