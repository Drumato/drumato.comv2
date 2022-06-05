import fs from "fs";
import { GetStaticProps } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { Markdown } from "~/components/Markdown";
import MainLayout from "~/layouts/MainLayout";

type AboutProps = {
  content: string;
};

const getStaticProps: GetStaticProps<AboutProps> = async ({ locale }) => {
  const aboutPath = `markdowns/${locale}/about.md`;
  const content: string = fs.readFileSync(aboutPath, "utf-8");

  return {
    props: {
      content: content,
    },
  };
};

const About: NextPageWithLayout<AboutProps> = ({ content }: AboutProps) => {
  return <Markdown content={content} />;
};

About.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default About;
export { getStaticProps };
