import fs from "fs";
import matter, { GrayMatterFile } from "gray-matter";
import { GetStaticProps } from "next";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { Markdown } from "~/components/Markdown";
import MainLayout from "~/layouts/MainLayout";
import { extractMarkdownFrontMatter } from "~/utils/markdown";

type ContactsProps = {
  markdown: string;
  frontmatter: MarkdownFrontMatter;
};

export const getStaticProps: GetStaticProps<ContactsProps> = async ({
  locale,
}) => {
  const filePath = `markdowns/${locale}/contacts.md`;
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

const Contacts: NextPageWithLayout<ContactsProps> = (props: ContactsProps) => {
  return <Markdown markdown={props.markdown} frontmatter={props.frontmatter} />;
};

Contacts.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default Contacts;
