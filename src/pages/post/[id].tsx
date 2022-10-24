import path from "path";
import fs from "fs";

import { GetStaticProps, GetStaticPaths } from "next";
import React from "react";
import { EntryMarkdown } from "~/components/entry/Markdown";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import {
  extractMarkdownFrontMatter,
  getPathsFromMarkdownDir,
} from "~/utils/markdown";
import { english, japanese } from "~/locales/supported";
import matter from "gray-matter";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import BlogEntryHead from "~/components/entry/BlogEntryHead";
import {
  drumatoBaseURL,
  entryContentLink,
  entryKindPost,
} from "~/utils/siteLink";
import useLocale from "~/hooks/useLocale";

type PostProps = {
  id: string;
  markdown: string;
  frontmatter: MarkdownFrontMatter;
};

type PostPath = {
  id: string;
};

const postDirectory = (locale: string) => `markdowns/${locale}/post`;
const jaPostDirectory = postDirectory(japanese);
const enPostDirectory = postDirectory(english);

export const getStaticPaths: GetStaticPaths<PostPath> = async () => {
  const jaPosts = getPathsFromMarkdownDir(japanese, jaPostDirectory);
  const enPosts = getPathsFromMarkdownDir(english, enPostDirectory);

  const allPostPaths = {
    ...jaPosts,
    paths: jaPosts.paths.concat(enPosts.paths),
  };

  return allPostPaths;
};

export const getStaticProps: GetStaticProps<PostProps> = async ({
  params,
  locale,
}) => {
  const fileName = `${params?.id}.md`;
  const postDirectoryWithLocale = postDirectory(locale ?? english);
  const filePath = path.join(postDirectoryWithLocale, fileName);

  const content = fs.readFileSync(filePath, { encoding: "utf-8" });
  const markdown = matter(content);
  const fronmatter = extractMarkdownFrontMatter(markdown);

  return {
    props: {
      id: `${params?.id}`,
      markdown: markdown.content,
      frontmatter: fronmatter,
    },
  };
};

const Post: NextPageWithLayout<PostProps> = (props: PostProps) => {
  const { rawLocale } = useLocale();
  const url = entryContentLink(rawLocale, entryKindPost, props.id);
  const imagePath =
    props.frontmatter.thumbnailLink === ""
      ? props.frontmatter.imageLink
      : props.frontmatter.thumbnailLink;
  const imageLink = drumatoBaseURL + `/${imagePath}`;

  return (
    <>
      <BlogEntryHead
        entryName={props.frontmatter.title}
        description={props.frontmatter.description}
        entryKind={entryKindPost}
        id={props.id}
        imageLink={imageLink}
      />
      <EntryMarkdown
        markdown={props.markdown}
        frontmatter={props.frontmatter}
        url={url}
        entryKind={entryKindPost}
      />
    </>
  );
};

Post.getLayout = (page) => {
  return <MainLayout containerWidth="xl">{page}</MainLayout>;
};

export default Post;
