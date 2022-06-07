import { GetStaticProps } from "next";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { Markdown } from "~/components/entry/Markdown";
import MainLayout from "~/layouts/MainLayout";
import { parseMarkdownForEntry } from "~/utils/markdown";

type AboutProps = {
  markdown: string;
  frontmatter: MarkdownFrontMatter;
};

export const getStaticProps: GetStaticProps<AboutProps> = async ({
  locale,
}) => {
  const filePath = `markdowns/${locale}/about.md`;
  const entry = parseMarkdownForEntry(filePath);

  return {
    props: {
      markdown: entry.markdown.content,
      frontmatter: entry.frontmatter,
    },
  };
};

const About: NextPageWithLayout<AboutProps> = (props: AboutProps) => {
  return <Markdown markdown={props.markdown} frontmatter={props.frontmatter} />;
};

About.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default About;
