import path from "path";
import fs from "fs";

import { GetStaticProps, GetStaticPaths } from "next";
import React from "react";
import { Markdown } from "~/components/Markdown";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import { getPathsFromMarkdownDir } from "~/utils/markdown";
import { english, japanese } from "~/locales/supported";

type DiaryProps = {
  content: string;
};

type DiaryPath = {
  id: string;
};

const diaryDirectory = (locale: string) => `markdowns/${locale}/diary`;
const jaDiaryDirectory = diaryDirectory(japanese);
const enDiaryDirectory = diaryDirectory(english);

export const getStaticPaths: GetStaticPaths<DiaryPath> = async () => {
  const jaDiaries = getPathsFromMarkdownDir(japanese, jaDiaryDirectory);
  const enDiaries = getPathsFromMarkdownDir(english, enDiaryDirectory);

  const allDiaryPaths = {
    ...jaDiaries,
    paths: jaDiaries.paths.concat(enDiaries.paths),
  };

  return allDiaryPaths;
};

export const getStaticProps: GetStaticProps<DiaryProps> = async ({
  params,
  locale,
}) => {
  const fileName = `${params?.id}.md`;
  const diaryDirectoryWithLocale = diaryDirectory(locale ?? english);
  const filePath = path.join(diaryDirectoryWithLocale, fileName);
  console.log(filePath);

  const content = fs.readFileSync(filePath, { encoding: "utf-8" });

  return {
    props: {
      id: params?.id,
      content: content,
    },
  };
};

const Diary: NextPageWithLayout<DiaryProps> = ({ content }: DiaryProps) => {
  return <Markdown content={content} />;
};

Diary.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default Diary;
