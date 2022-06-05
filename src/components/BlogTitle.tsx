import { Button, styled, Typography } from "@mui/material";
import { ReactNode } from "react";

type BlogTitleProps = {
  siteTitle: string;
};

type BlogTitleButtonProps = {
  children: ReactNode;
};

const BlogTitleButton = (props: BlogTitleButtonProps): JSX.Element => {
  const StyledButton = styled(Button)({
    width: "10px",
    padding: "20px",
    marginRight: "30px",
    color: "#FFFFFF",
    fontFamily: "Klee One",
  });

  return (
    <StyledButton size="small" href="/">
      {props.children}
    </StyledButton>
  );
};

const BlogTitle = (props: BlogTitleProps) => {
  return <BlogTitleButton>{props.siteTitle}</BlogTitleButton>;
};

export default BlogTitle;
