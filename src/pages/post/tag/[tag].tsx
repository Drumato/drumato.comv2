import fs from "fs";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { GetStaticPaths, GetStaticProps } from "next";
import MainLayout from "~/layouts/MainLayout";
import { english, japanese } from "~/locales/supported";
import { MarkdownEntry, readMarkdownsFromDir } from "~/utils/markdown";
import path from "path";
import BlogCardGrid from "~/components/BlogCardGrid";

type PostItem = {
  link: string;
  title: string;
  createdAt: string;
  imageLink: string;
  description: string;
};

type TagProps = {
  posts: PostItem[];
};

type TagPath = {
  tag: string;
};

export const getStaticPaths: GetStaticPaths<TagPath> = async () => {
  const tagsFile = fs.readFileSync("markdowns/all-posttags.json", {
    encoding: "utf-8",
  });
  const tags: string[] = JSON.parse(tagsFile);
  const jaPaths = tags.map((tag) => {
    return {
      params: {
        tag: tag,
      },
      locale: japanese,
    };
  });
  const paths = jaPaths.concat(
    tags.map((tag) => {
      return {
        params: {
          tag: tag,
        },
        locale: english,
      };
    })
  );

  return { paths: paths, fallback: false };
};

export const getStaticProps: GetStaticProps<TagProps> = async ({
  params,
  locale,
}) => {
  const tag = `${params?.tag}`;
  const postDirectory = `markdowns/${locale}/post`;
  const entries = readMarkdownsFromDir(postDirectory);
  const posts = entries
    .filter((entry) => entry.frontmatter.tags.includes(tag))
    .map((entry) => {
      const id = path.basename(entry.fileName, ".md");
      const link = `/${locale}/post/${id}`;

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
      posts: posts,
    },
  };
};

const Tag: NextPageWithLayout<TagProps> = (props) => {
  return <BlogCardGrid cards={props.posts} />;
};

Tag.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default Tag;
