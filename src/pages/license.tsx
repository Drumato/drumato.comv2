import fs from "fs";
import { GetStaticProps } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { Markdown } from "~/components/Markdown";
import MainLayout from "~/layouts/MainLayout";
import matter, { GrayMatterFile } from "gray-matter";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import { extractMarkdownFrontMatter } from "~/utils/markdown";

type LicenseProps = {
  markdown: string;
  frontmatter: MarkdownFrontMatter;
};

export const getStaticProps: GetStaticProps<LicenseProps> = async ({
  locale,
}) => {
  const filePath = `markdowns/${locale}/license.md`;
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

const License: NextPageWithLayout<LicenseProps> = (props: LicenseProps) => {
  return <Markdown markdown={props.markdown} frontmatter={props.frontmatter} />;
};

License.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default License;
