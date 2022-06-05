import fs from "fs";
import { GetStaticProps } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { Markdown } from "~/components/Markdown";
import MainLayout from "~/layouts/MainLayout";

type ContactsProps = {
  content: string;
};

export const getStaticProps: GetStaticProps<ContactsProps> = async ({
  locale,
}) => {
  const filePath = `markdowns/${locale}/contacts.md`;
  const content: string = fs.readFileSync(filePath, "utf-8");

  return {
    props: {
      content: content,
    },
  };
};

const Contacts: NextPageWithLayout<ContactsProps> = ({
  content,
}: ContactsProps) => {
  return <Markdown content={content} />;
};

Contacts.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default Contacts;
