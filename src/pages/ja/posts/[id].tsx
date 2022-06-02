import path from "path";
import fs from "fs";
import "prismjs";
import "prismjs/themes/prism.css";

import { GetStaticProps, GetStaticPaths, NextPage } from "next";
import PostLayout from "~/layouts/PostLayout";
import React from "react";
import ReactMarkdown from "react-markdown";
import matter from "gray-matter";

type PostProps = {
  id: string;
  content: string;
};

const postDirectory = "static/posts";

const getStaticPaths: GetStaticPaths = async () => {
  const fileNames = fs.readdirSync(postDirectory);
  const extractID = (fileName: string): string => {
    // note that path.basename will remove the extension
    // if the optional 2nd arg is given.
    const id = path.basename(fileName, ".md");
    return id;
  };

  const paths = fileNames.map((fileName) => {
    return {
      params: {
        id: extractID(fileName),
      },
    };
  });

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

const Post: NextPage<PostProps> = (props: PostProps) => {
  const markdown = matter(props.content);
  return (
    <>
      <PostLayout>
        <>
          <>{props.id}</>
          <br />
          <ReactMarkdown>{markdown.content}</ReactMarkdown>
        </>
      </PostLayout>
    </>
  );
};

export { getStaticPaths, getStaticProps };
export default Post;
