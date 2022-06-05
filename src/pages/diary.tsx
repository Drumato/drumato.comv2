import { GetStaticProps, NextPage } from "next";
import { NextPageWithLayout } from "~/@types/NextPageWithLayout";
import MainLayout from "~/layouts/MainLayout";
import { listIDFromMarkdownDir } from "~/utils/markdown";

type DiaryItem = {
  link: string;
  // INFO: the type should have the title
};

type DiaryItemProps = {
  // INFO: I want the diary's title.
  diaries: DiaryItem[];
};

const getStaticProps: GetStaticProps<DiaryItemProps> = async ({ locale }) => {
  const postDirectory = `markdowns/${locale}/diary`;
  const ids = listIDFromMarkdownDir(postDirectory);
  const posts = ids.map((id) => {
    return { link: `/${locale}/diary/${id}` };
  });

  return {
    props: {
      diaries: posts,
    },
  };
};

const DiaryList: NextPageWithLayout<DiaryItemProps> = (
  diaryProps: DiaryItemProps
) => {
  return (
    <ul>
      {diaryProps.diaries.map((diary) => {
        return (
          <li key={diary.link}>
            <a href={diary.link}>{diary.link}</a>
          </li>
        );
      })}
    </ul>
  );
};

DiaryList.getLayout = (page) => {
  return <MainLayout>{page}</MainLayout>;
};

export { getStaticProps };
export default DiaryList;
