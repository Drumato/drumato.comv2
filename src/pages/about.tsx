import fs from "fs";
import matter, { GrayMatterFile } from "gray-matter";
import { GetStaticProps } from "next";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { Markdown } from "~/components/Markdown";
import MainLayout from "~/layouts/MainLayout";
import { extractMarkdownFrontMatter } from "~/utils/markdown";

type AboutProps = {
  markdown: string;
  frontmatter: MarkdownFrontMatter;
};

export const getStaticProps: GetStaticProps<AboutProps> = async ({
  locale,
}) => {
  const aboutPath = `markdowns/${locale}/about.md`;
  const content = fs.readFileSync(aboutPath, "utf-8");
  const markdown = matter(content);
  const frontmatter = extractMarkdownFrontMatter(markdown);

  return {
    props: {
      markdown: markdown.content,
      frontmatter: frontmatter,
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
