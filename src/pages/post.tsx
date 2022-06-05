import fs from "fs";
import { GetStaticProps, NextPage } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import { listIDFromMarkdownDir } from "~/utils/markdown";

type PostListProps = {
  ids: string[];
};

const getStaticProps: GetStaticProps<PostListProps> = async ({ locale }) => {
  const postDirectory = `markdowns/${locale}/post`;
  const ids = listIDFromMarkdownDir(postDirectory);

  return {
    props: {
      ids: ids,
    },
  };
};

const PostList: NextPageWithLayout<PostListProps> = (
  postProps: PostListProps
) => {
  return (
    <ul>
      {postProps.ids.map((id) => {
        return (
          <li key={id}>
            <a href={`/ja/post/${id}`}>{id}</a>
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
