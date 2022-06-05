import fs from "fs";
import { GetStaticProps, NextPage } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import { listIDFromMarkdownDir } from "~/utils/markdown";

type PostItem = {
  link: string;
  // INFO: the type should have the title
};

type PostListProps = {
  // INFO: I want the post's title.
  posts: PostItem[];
};

const getStaticProps: GetStaticProps<PostListProps> = async ({ locale }) => {
  const postDirectory = `markdowns/${locale}/post`;
  const ids = listIDFromMarkdownDir(postDirectory);
  const posts = ids.map((id) => {
    return { link: `/${locale}/post/${id}` };
  });

  return {
    props: {
      posts: posts,
    },
  };
};

const PostList: NextPageWithLayout<PostListProps> = (
  postProps: PostListProps
) => {
  return (
    <ul>
      {postProps.posts.map((post) => {
        return (
          <li key={post.link}>
            <a href={post.link}>{post.link}</a>
          </li>
        );
      })}
    </ul>
  );
};
PostList.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export { getStaticProps };
export default PostList;
