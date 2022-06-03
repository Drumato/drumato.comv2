import { GetStaticProps, NextPage } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";

type PostListProps = {
  ids: string[];
};

const getStaticProps: GetStaticProps<PostListProps> = async ({ params }) => {
  // TODO: list all markdowns in markdowns/posts.
  return {
    props: {
      ids: ["sample"],
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
