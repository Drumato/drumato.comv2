import { GetStaticProps } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import path from "path";
import {
  parseMarkdownEntries,
  sortMarkdownEntriesAsFresh,
} from "~/utils/markdown";
import BlogCardGrid from "~/components/entries/BlogCardGrid";
import BlogEntriesHead from "~/components/entries/BlogEntriesHead";
import useLocale from "~/hooks/useLocale";
import { categoryDiary } from "~/locales/category";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import {
  categoryLink,
  entryContentPath,
  entryKindDiary,
} from "~/utils/siteLink";

type DiaryItem = {
  path: string;
  frontmatter: MarkdownFrontMatter;
};

type DiaryItemProps = {
  // INFO: I want the diary's title.
  diaries: DiaryItem[];
};

export const getStaticProps: GetStaticProps<DiaryItemProps> = async ({
  locale,
}) => {
  const diaryDirectory = `markdowns/${locale}/diary`;
  const entries = parseMarkdownEntries(diaryDirectory);
  const sortedEntries = sortMarkdownEntriesAsFresh(entries);
  const diaries = sortedEntries.map((entry) => {
    const id = path.basename(entry.fileName, ".md");
    const diaryPath = entryContentPath(`${locale}`, entryKindDiary, id);

    return {
      path: diaryPath,
      frontmatter: entry.frontmatter,
    };
  });

  return {
    props: {
      diaries: diaries,
    },
  };
};

const DiaryList: NextPageWithLayout<DiaryItemProps> = (
  props: DiaryItemProps
) => {
  const loc = useLocale();
  const title = loc.categories.get(categoryDiary) ?? entryKindDiary;
  const url = categoryLink(loc.rawLocale, entryKindDiary);
  return (
    <>
      <BlogEntriesHead title={title} link={url}></BlogEntriesHead>
      <BlogCardGrid cards={props.diaries} />
    </>
  );
};

DiaryList.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default DiaryList;
