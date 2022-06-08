import { GetStaticProps } from "next";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { CategoryMarkdown } from "~/components/entry/Markdown";
import MainLayout from "~/layouts/MainLayout";
import { parseMarkdownEntry } from "~/utils/markdown";

type DisclaimerProps = {
  markdown: string;
  frontmatter: MarkdownFrontMatter;
};

export const getStaticProps: GetStaticProps<DisclaimerProps> = async ({
  locale,
}) => {
  const filePath = `markdowns/${locale}/disclaimer.md`;
  const entry = parseMarkdownEntry(filePath);

  return {
    props: {
      markdown: entry.markdown.content,
      frontmatter: entry.frontmatter,
    },
  };
};

const Disclaimer: NextPageWithLayout<DisclaimerProps> = (
  props: DisclaimerProps
) => {
  return (
    <CategoryMarkdown
      markdown={props.markdown}
      frontmatter={props.frontmatter}
    />
  );
};

Disclaimer.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default Disclaimer;
