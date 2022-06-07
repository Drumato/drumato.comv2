import { GetStaticProps } from "next";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { Markdown } from "~/components/entry/Markdown";
import MainLayout from "~/layouts/MainLayout";
import { parseMarkdownEntry } from "~/utils/markdown";

type ContactsProps = {
  markdown: string;
  frontmatter: MarkdownFrontMatter;
};

export const getStaticProps: GetStaticProps<ContactsProps> = async ({
  locale,
}) => {
  const filePath = `markdowns/${locale}/contacts.md`;
  const entry = parseMarkdownEntry(filePath);

  return {
    props: {
      markdown: entry.markdown.content,
      frontmatter: entry.frontmatter,
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
