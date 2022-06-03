import path from "path";
import fs from "fs";

import { GetStaticProps, GetStaticPaths, NextPage } from "next";
import React from "react";
import { Markdown } from "~/components/Markdown";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";

type PostProps = {
  id: string;
  content: string;
};

type PostPaths = {
  id: string;
};

const postDirectory = "markdowns/ja/post";

const getStaticPaths: GetStaticPaths<PostPaths> = async () => {
  const fileNames = fs.readdirSync(postDirectory);
  const extractID = (fileName: string): string => {
    // note that path.basename will remove the extension
    // if the optional 2nd arg is given.
    const id = path.basename(fileName, ".md");
    return id;
  };

  const paths = fileNames.map((fileName) => ({
    params: {
      id: extractID(fileName),
    },
  }));

  return {
    paths: paths,
    fallback: true,
  };
};

const getStaticProps: GetStaticProps = async ({ params }) => {
  const fileName = `${params?.id}.md`;
  const filePath = path.join(postDirectory, fileName);
  const content = fs.readFileSync(filePath, "utf-8");

  return {
    props: {
      id: params?.id,
      content: content,
    },
  };
};

// the dynamic page in Next.js may require the defalut argument to the props.
const Post: NextPageWithLayout<PostProps> = ({
  id = "",
  content = "",
}: PostProps) => {
  return <Markdown content={content} />;
};

Post.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export { getStaticProps, getStaticPaths };
export default Post;
