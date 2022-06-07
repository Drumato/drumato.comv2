import fs from "fs";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import { GetStaticPaths, GetStaticProps } from "next";
import MainLayout from "~/layouts/MainLayout";
import { english, japanese } from "~/locales/supported";
import {
  filterEntriesWithTag,
  parseMarkdownEntries,
  sortMarkdownEntriesAsFresh,
} from "~/utils/markdown";
import path from "path";
import BlogCardGrid from "~/components/entries/BlogCardGrid";
import BlogEntriesHead from "~/components/entries/BlogEntriesHead";
import useLocale from "~/hooks/useLocale";
import { categoryDiary } from "~/locales/category";
import { MarkdownFrontMatter } from "~/@types/Markdown";

type DiaryItem = {
  link: string;
  frontmatter: MarkdownFrontMatter;
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
  const tagToPath = (tag: string, locale: string) => {
    return {
      params: {
        tag: tag,
      },
      locale: locale,
    };
  };

  const jaPaths = tags.map((tag) => tagToPath(tag, japanese));
  const enPaths = tags.map((tag) => tagToPath(tag, english));
  const paths = jaPaths.concat(enPaths);

  return { paths: paths, fallback: false };
};

export const getStaticProps: GetStaticProps<TagProps> = async ({
  params,
  locale,
}) => {
  const tag = `${params?.tag}`;
  const postDirectory = `markdowns/${locale}/diary`;
  const entries = parseMarkdownEntries(postDirectory);
  const sortedEntries = sortMarkdownEntriesAsFresh(entries);
  const diaries = filterEntriesWithTag(sortedEntries, tag).map((entry) => {
    const id = path.basename(entry.fileName, ".md");
    const link = `/${locale}/diary/${id}`;

    return {
      link: link,
      frontmatter: entry.frontmatter,
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
