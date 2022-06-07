import fs from "fs";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { GetStaticPaths, GetStaticProps } from "next";
import MainLayout from "~/layouts/MainLayout";
import { english, japanese } from "~/locales/supported";
import {
  readMarkdownsFromDir,
  sortMarkdownEntriesAsFresh,
} from "~/utils/markdown";
import path from "path";
import BlogCardGrid from "~/components/entries/BlogCardGrid";
import BlogEntriesHead from "~/components/entries/BlogEntriesHead";
import useLocale from "~/hooks/useLocale";
import { categoryDiary } from "~/locales/category";

type DiaryItem = {
  link: string;
  title: string;
  createdAt: string;
  imageLink: string;
  description: string;
};

type TagProps = {
  tag: string;
  diaries: DiaryItem[];
};

type TagPath = {
  tag: string;
};

export const getStaticPaths: GetStaticPaths<TagPath> = async () => {
  const tagsFile = fs.readFileSync("markdowns/all-diarytags.json", {
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
  const postDirectory = `markdowns/${locale}/diary`;
  const entries = readMarkdownsFromDir(postDirectory);
  const sortedEntries = sortMarkdownEntriesAsFresh(entries);
  const diaries = sortedEntries
    .filter((entry) => entry.frontmatter.tags.includes(tag))
    .map((entry) => {
      const id = path.basename(entry.fileName, ".md");
      const link = `/${locale}/diary/${id}`;

      return {
        link: link,
        ...entry.frontmatter,
      };
    });

  return {
    props: {
      diaries: diaries,
      tag: tag,
    },
  };
};

const Tag: NextPageWithLayout<TagProps> = (props) => {
  const loc = useLocale();
  const entryCategory = loc.categories.get(categoryDiary) ?? "diary";
  const tagDescription = `tag: ${props.tag}`;
  const title = `${tagDescription} | ${entryCategory}`;

  return (
    <>
      <BlogEntriesHead
        title={title}
        link={`/diary/tag/${props.tag}`}
      ></BlogEntriesHead>
      <h1>{tagDescription}</h1>
      <BlogCardGrid cards={props.diaries} />
    </>
  );
};

Tag.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default Tag;
