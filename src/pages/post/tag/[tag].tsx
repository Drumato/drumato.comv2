import fs from "fs";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { GetStaticPaths, GetStaticProps } from "next";
import MainLayout from "~/layouts/MainLayout";
import { english, japanese } from "~/locales/supported";
import { readMarkdownsFromDir } from "~/utils/markdown";
import path from "path";
import BlogCardGrid from "~/components/entries/BlogCardGrid";
import BlogEntriesHead from "~/components/entries/BlogEntriesHead";
import useLocale from "~/hooks/useLocale";
import { categoryPost } from "~/locales/category";

type PostItem = {
  link: string;
  title: string;
  createdAt: string;
  imageLink: string;
  description: string;
};

type TagProps = {
  tag: string;
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
  // descending order of the created time
  const sortedPosts = posts.sort((a, b) => {
    const aAge = Date.parse(a.createdAt);
    const bAge = Date.parse(b.createdAt);
    return bAge - aAge;
  });

  return {
    props: {
      posts: sortedPosts,
      tag: tag,
    },
  };
};

const Tag: NextPageWithLayout<TagProps> = (props) => {
  const loc = useLocale();
  const entryCategory = loc.categories.get(categoryPost) ?? "post";
  const tagDescription = `tag: ${props.tag}`;
  const title = `${tagDescription} | ${entryCategory}`;
  return (
    <>
      <BlogEntriesHead
        title={title}
        link={`/post/tag/${props.tag}`}
      ></BlogEntriesHead>
      <h1>{tagDescription}</h1>
      <BlogCardGrid cards={props.posts} />
    </>
  );
};

Tag.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default Tag;
