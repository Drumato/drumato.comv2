import { FC, ReactElement } from "react";
import BlogFooter from "~/components/BlogFooter";
import BlogHeader from "~/components/BlogHeader";

type Props = {
  children: ReactElement;
};

const siteTitle = "drumato.com";
const year = 2022;
const author = "Drumato";

const MainLayout = ({ children }: Props) => {
  return (
    <>
      <BlogHeader siteTitle={siteTitle} categoryBaseDir={"ja"} />
      {children}
      <BlogFooter year={year} author={author} />
    </>
  );
};

export default MainLayout;
