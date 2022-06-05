import path from "path";
import fs from "fs";

import { GetStaticProps, GetStaticPaths } from "next";
import React from "react";
import { Markdown } from "~/components/Markdown";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import { getPathsFromMarkdownDir } from "~/utils/markdown";

type PostProps = {
  content: string;
};

type PostPath = {
  id: string;
};

const postDirectory = (locale: string) => `markdowns/${locale}/post`;
const jaPostDirectory = postDirectory("ja");
const enPostDirectory = postDirectory("en");

const getStaticPaths: GetStaticPaths<PostPath> = async () => {
  const jaPosts = getPathsFromMarkdownDir("ja", jaPostDirectory);
  const enPosts = getPathsFromMarkdownDir("en", enPostDirectory);

  const allPostPaths = {
    ...jaPosts,
    paths: jaPosts.paths.concat(enPosts.paths),
  };

  return allPostPaths;
};

const getStaticProps: GetStaticProps = async ({ params, locale }) => {
  const fileName = `${params?.id}.md`;
  const postDirectoryWithLocale = postDirectory(locale ?? "en");
  const filePath = path.join(postDirectoryWithLocale, fileName);
  const content = fs.readFileSync(filePath, "utf-8");

  return {
    props: {
      id: params?.id,
      content: content,
    },
  };
};

// the dynamic page in Next.js may require the defalut argument to the props.
const Post: NextPageWithLayout<PostProps> = ({ content }: PostProps) => {
  return <Markdown content={content} />;
};

Post.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export { getStaticProps, getStaticPaths };
export default Post;
