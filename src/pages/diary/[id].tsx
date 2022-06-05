import path from "path";
import fs from "fs";

import { GetStaticProps, GetStaticPaths } from "next";
import React from "react";
import { Markdown } from "~/components/Markdown";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import {
  extractMarkdownFrontMatter,
  getPathsFromMarkdownDir,
} from "~/utils/markdown";
import { english, japanese } from "~/locales/supported";
import matter, { GrayMatterFile } from "gray-matter";
import { MarkdownFrontMatter } from "~/@types/Markdown";

type DiaryProps = {
  markdown: string;
  frontmatter: MarkdownFrontMatter;
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

  const content = fs.readFileSync(filePath, { encoding: "utf-8" });
  const markdown = matter(content);
  const fronmatter = extractMarkdownFrontMatter(markdown);

  return {
    props: {
      id: params?.id,
      markdown: markdown.content,
      frontmatter: fronmatter,
    },
  };
};

const Diary: NextPageWithLayout<DiaryProps> = (props: DiaryProps) => {
  return <Markdown markdown={props.markdown} frontmatter={props.frontmatter} />;
};

Diary.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default Diary;
