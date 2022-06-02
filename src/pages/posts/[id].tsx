import { GetStaticProps, GetStaticPaths, NextPage } from "next";
import { ReactElement, JSXElementConstructor } from "react";
import PostLayout from "~/layouts/PostLayout";

interface PostProps {
  id: string;
}

const getStaticPaths: GetStaticPaths = async () => {
  // TODO: get all markdowns from /static/posts/
  return {
    paths: [{ params: { id: "sample" } }],
    fallback: true,
  };
};

const getStaticProps: GetStaticProps = async ({ params }) => {
  // TODO: read markdown file and store it into the props
  return {
    props: {
      id: "sample",
    },
  };
};

const Post: NextPage<PostProps> = ({ id }) => {
  // TODO: pass the metadata and contents of a markdown to layout.
  //       maybe we should separate into some components
  return (
    <>
      <PostLayout>
        <>{id}</>
      </PostLayout>
    </>
  );
};

export { getStaticPaths, getStaticProps };
export default Post;
