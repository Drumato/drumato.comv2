import { GetStaticProps } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import path from "path";
import { readMarkdownsFromDir } from "~/utils/markdown";
import BlogCardGrid from "~/components/BlogCardGrid";

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
  const entries = readMarkdownsFromDir(postDirectory);
  const posts = entries.map((entry) => {
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
    },
  };
};

const PostList: NextPageWithLayout<PostListProps> = (
  postListProps: PostListProps
) => {
  return <BlogCardGrid cards={postListProps.posts} />;
};

PostList.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export default PostList;
