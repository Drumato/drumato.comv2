import fs from "fs";
import matter, { GrayMatterFile } from "gray-matter";
import { GetStaticProps } from "next";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { Markdown } from "~/components/Markdown";
import MainLayout from "~/layouts/MainLayout";
import { extractMarkdownFrontMatter } from "~/utils/markdown";

type DisclaimerProps = {
  markdown: string;
  frontmatter: MarkdownFrontMatter;
};

export const getStaticProps: GetStaticProps<DisclaimerProps> = async ({
  locale,
}) => {
  const filePath = `markdowns/${locale}/disclaimer.md`;
  const content: string = fs.readFileSync(filePath, "utf-8");
  const markdown = matter(content);
  const frontmatter = extractMarkdownFrontMatter(markdown);

  return {
    props: {
      markdown: markdown.content,
      frontmatter: frontmatter,
    },
  };
};

const Disclaimer: NextPageWithLayout<DisclaimerProps> = (
  props: DisclaimerProps
) => {
  return <Markdown markdown={props.markdown} frontmatter={props.frontmatter} />;
};

Disclaimer.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default Disclaimer;
