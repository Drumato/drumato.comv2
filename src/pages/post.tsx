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
import { categoryPost } from "~/locales/category";

type PostItem = {
  link: string;
  title: string;
  createdAt: string;
  imageLink: string;
  description: string;
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
    const link = `/${locale}/post/${id}`;

    return {
      link: link,
      ...entry.frontmatter,
    };
  });

  return {
    props: {
      posts: posts,
    },
  };
};

const PostList: NextPageWithLayout<PostListProps> = (
  postListProps: PostListProps
) => {
  const loc = useLocale();
  const title = loc.categories.get(categoryPost) ?? "post";

  return (
    <>
      <BlogEntriesHead title={title} link="/post"></BlogEntriesHead>
      <BlogCardGrid cards={postListProps.posts} />
    </>
  );
};

PostList.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default PostList;
