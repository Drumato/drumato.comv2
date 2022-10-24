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
import BlogCardGrid from "~/components/entries/BlogEntryList";
import BlogEntriesHead from "~/components/entries/BlogEntriesHead";
import useLocale from "~/hooks/useLocale";
import { categoryPost } from "~/locales/category";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import {
  entryContentPath,
  entryKindPost,
  tagSearchLink,
} from "~/utils/siteLink";

type PostItem = {
  path: string;
  frontmatter: MarkdownFrontMatter;
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
  const postDirectory = `markdowns/${locale}/${entryKindPost}`;
  const entries = parseMarkdownEntries(postDirectory);
  const sortedEntries = sortMarkdownEntriesAsFresh(entries);
  const posts = filterEntriesWithTag(sortedEntries, tag).map((entry) => {
    const id = path.basename(entry.fileName, ".md");
    const postPath = entryContentPath(`${locale}`, entryKindPost, id);

    return {
      path: postPath,
      frontmatter: entry.frontmatter,
    };
  });

  return {
    props: {
      posts: posts,
      tag: tag,
    },
  };
};

const Tag: NextPageWithLayout<TagProps> = (props) => {
  const loc = useLocale();
  const categoryName = loc.categories.get(categoryPost) ?? entryKindPost;
  const tagDescription = `tag: ${props.tag}`;
  const title = `${tagDescription} | ${categoryName}`;
  const tagPath = tagSearchLink(loc.rawLocale, entryKindPost, props.tag);

  return (
    <>
      <BlogEntriesHead title={title} link={tagPath}></BlogEntriesHead>
      <h1>{tagDescription}</h1>
      <BlogCardGrid cards={props.posts} />
    </>
  );
};

Tag.getLayout = (page) => {
  return <MainLayout containerWidth="xl">{page}</MainLayout>;
};

export default Tag;
