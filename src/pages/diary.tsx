import { GetStaticProps } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import path from "path";
import { readMarkdownsFromDir } from "~/utils/markdown";
import BlogCardGrid from "~/components/entries/BlogCardGrid";
import BlogEntriesHead from "~/components/entries/BlogEntriesHead";
import useLocale from "~/hooks/useLocale";
import { categoryDiary } from "~/locales/category";

type DiaryItem = {
  link: string;
  title: string;
  createdAt: string;
  imageLink: string;
  description: string;
};

type DiaryItemProps = {
  // INFO: I want the diary's title.
  diaries: DiaryItem[];
};

export const getStaticProps: GetStaticProps<DiaryItemProps> = async ({
  locale,
}) => {
  const diaryDirectory = `markdowns/${locale}/diary`;
  const entries = readMarkdownsFromDir(diaryDirectory);
  const diaries = entries.map((entry) => {
    const id = path.basename(entry.fileName, ".md");
    const link = `/${locale}/diary/${id}`;

    return {
      link: link,
      title: entry.frontmatter.title,
      createdAt: entry.frontmatter.createdAt,
      imageLink: entry.frontmatter.imageLink,
      description: entry.frontmatter.description,
    };
  });

  // descending order of the created time
  const sortedDiaries = diaries.sort((a, b) => {
    const aAge = Date.parse(a.createdAt);
    const bAge = Date.parse(b.createdAt);
    return bAge - aAge;
  });

  return {
    props: {
      diaries: sortedDiaries,
    },
  };
};

const DiaryList: NextPageWithLayout<DiaryItemProps> = (
  diaryProps: DiaryItemProps
) => {
  const loc = useLocale();
  const title = loc.categories.get(categoryDiary) ?? "diary";
  return (
    <>
      <BlogEntriesHead title={title} link="/diary"></BlogEntriesHead>
      <BlogCardGrid cards={diaryProps.diaries} />
    </>
  );
};

DiaryList.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default DiaryList;
