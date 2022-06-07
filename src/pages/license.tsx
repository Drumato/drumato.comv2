import { GetStaticProps } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { Markdown } from "~/components/entry/Markdown";
import MainLayout from "~/layouts/MainLayout";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import { parseMarkdownForEntry } from "~/utils/markdown";

type LicenseProps = {
  markdown: string;
  frontmatter: MarkdownFrontMatter;
};

export const getStaticProps: GetStaticProps<LicenseProps> = async ({
  locale,
}) => {
  const filePath = `markdowns/${locale}/license.md`;
  const entry = parseMarkdownForEntry(filePath);

  return {
    props: {
      markdown: entry.markdown.content,
      frontmatter: entry.frontmatter,
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
