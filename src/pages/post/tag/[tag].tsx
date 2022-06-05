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

// collects all tags in the markdowns in the post directory.
// for getStaticPaths, the tag is duplicated btw locales.
// markdowns: [{tags: ["go"], locale: "ja"}, {tags: ["go"], locale: "ja"}]
// returns: [{tag: "go", locale: "ja"}, {tag: "go", locale: "ja"}]
const setUniqueTagSetInLocaleFromMarkdowns = (
  markdowns: {
    tags: string[];
    locale: string;
  }[]
): { tag: string; locale: string }[] => {
  const tagsSequence = markdowns.map((entry) => entry.tags);

  const allTagList = tagsSequence.reduceRight((prev, cur, _idx, _ary) => {
    return prev.concat(cur);
  });
  const allTagSet = new Set(allTagList);
  const allTags = Array.from(allTagSet).map((tag) => {
    return { tag: tag, locale: japanese };
  });
  allTags.push(
    ...allTags.map((entry) => {
      return { tag: entry.tag, locale: english };
    })
  );

  return allTags;
};

export const getStaticPaths: GetStaticPaths<TagPath> = async () => {
  const jaPostDirectory = `markdowns/${japanese}/post`;
  const enPostDirectory = `markdowns/${english}/post`;
  const jaPosts = readMarkdownsFromDir(jaPostDirectory).map((entry) => ({
    tags: entry.frontmatter.tags,
    locale: japanese,
  }));

  const enPosts = readMarkdownsFromDir(enPostDirectory).map((entry) => ({
    tags: entry.frontmatter.tags,
    locale: english,
  }));

  // note that allPostTags may have the duplicate tag.
  const allPosts = jaPosts.concat(enPosts);
  const allTagSet = setUniqueTagSetInLocaleFromMarkdowns(allPosts);

  const paths = allTagSet.map((entry) => {
    return {
      params: {
        tag: entry.tag,
      },
      locale: entry.locale,
    };
  });

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
