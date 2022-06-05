import fs from "fs";
import { GetStaticProps } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { Markdown } from "~/components/Markdown";
import MainLayout from "~/layouts/MainLayout";

type LicenseProps = {
  content: string;
};

export const getStaticProps: GetStaticProps<LicenseProps> = async ({
  locale,
}) => {
  const filePath = `markdowns/${locale}/license.md`;
  const content: string = fs.readFileSync(filePath, "utf-8");

  return {
    props: {
      content: content,
    },
  };
};

const License: NextPageWithLayout<LicenseProps> = ({
  content,
}: LicenseProps) => {
  return <Markdown content={content} />;
};

License.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default License;
