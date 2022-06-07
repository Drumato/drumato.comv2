import { Button, Typography } from "@mui/material";
import { ReactNode } from "react";

type BlogTitleProps = {
  siteTitle: string;
};

type BlogTitleButtonProps = {
  children: ReactNode;
};

const BlogTitleButton = (props: BlogTitleButtonProps): JSX.Element => {
  return (
    <Button size="medium" href="/" color="secondary">
      {props.children}
    </Button>
  );
};

const BlogTitle = (props: BlogTitleProps) => {
  return (
    <BlogTitleButton>
      <Typography fontWeight="bold" fontFamily="Klee One">
        {props.siteTitle}
      </Typography>
    </BlogTitleButton>
  );
};

export default BlogTitle;
