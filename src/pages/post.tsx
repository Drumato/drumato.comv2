import { GetStaticProps } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import path from "path";
import {
  parseMarkdownEntries,
  sortMarkdownEntriesAsFresh,
} from "~/utils/markdown";
import BlogEntriesHead from "~/components/entries/BlogEntriesHead";
import useLocale from "~/hooks/useLocale";
import { categoryPost } from "~/locales/category";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import {
  categoryLink,
  entryContentPath,
  entryKindPost,
} from "~/utils/siteLink";
import BlogEntryList from "~/components/entries/BlogEntryList";

type PostItem = {
  path: string;
  frontmatter: MarkdownFrontMatter;
};

type PostListProps = {
  posts: PostItem[];
};

export const getStaticProps: GetStaticProps<PostListProps> = async ({
  locale,
}) => {
  const postDirectory = `markdowns/${locale}/post`;
  const entries = parseMarkdownEntries(postDirectory);
  const sortedEntries = sortMarkdownEntriesAsFresh(entries);
  const posts = sortedEntries.map((entry) => {
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
    },
  };
};

const PostList: NextPageWithLayout<PostListProps> = (
  props: PostListProps
) => {
  const loc = useLocale();
  const title = loc.categories.get(categoryPost) ?? entryKindPost;
  const url = categoryLink(loc.rawLocale, entryKindPost);

  return (
    <>
      <BlogEntriesHead title={title} link={url}></BlogEntriesHead>
      <BlogEntryList cards={props.posts} />
    </>
  );
};

PostList.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default PostList;
