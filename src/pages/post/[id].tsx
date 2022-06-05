import path from "path";
import fs from "fs";

import { GetStaticProps, GetStaticPaths } from "next";
import React from "react";
import { Markdown } from "~/components/Markdown";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import { getPathsFromMarkdownDir } from "~/utils/markdown";
import { english, japanese } from "~/locales/supported";

type PostProps = {
  content: string;
};

type PostPath = {
  id: string;
};

const postDirectory = (locale: string) => `markdowns/${locale}/post`;
const jaPostDirectory = postDirectory(japanese);
const enPostDirectory = postDirectory(english);

const getStaticPaths: GetStaticPaths<PostPath> = async () => {
  const jaPosts = getPathsFromMarkdownDir(japanese, jaPostDirectory);
  const enPosts = getPathsFromMarkdownDir(english, enPostDirectory);

  const allPostPaths = {
    ...jaPosts,
    paths: jaPosts.paths.concat(enPosts.paths),
  };

  return allPostPaths;
};

const getStaticProps: GetStaticProps<PostProps> = async ({
  params,
  locale,
}) => {
  const fileName = `${params?.id}.md`;
  const postDirectoryWithLocale = postDirectory(locale ?? english);
  const filePath = path.join(postDirectoryWithLocale, fileName);
  console.log(filePath);

  const content = fs.readFileSync(filePath, { encoding: "utf-8" });

  return {
    props: {
      id: params?.id,
      content: content,
    },
  };
};

const Post: NextPageWithLayout<PostProps> = ({ content }: PostProps) => {
  return <Markdown content={content} />;
};

Post.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export { getStaticProps, getStaticPaths };
export default Post;
