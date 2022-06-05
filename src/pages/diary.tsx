import { GetStaticProps } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  extractMarkdownFrontMatter,
  readMarkdownsFromDir,
} from "~/utils/markdown";
import BlogCardGrid from "~/components/BlogCardGrid";

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

  return {
    props: {
      diaries: diaries,
    },
  };
};

const DiaryList: NextPageWithLayout<DiaryItemProps> = (
  diaryProps: DiaryItemProps
) => {
  return <BlogCardGrid cards={diaryProps.diaries} />;
};

DiaryList.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default DiaryList;
