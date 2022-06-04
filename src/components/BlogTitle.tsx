import { Button, styled, Typography } from "@mui/material";
import { ReactNode } from "react";

type BlogTitleProps = {
  siteTitle: string;
};

const StyledButton = styled(Button)({
  width: "10px",
  padding: "20px",
  marginRight: "30px",
});

type BlogTitleButtonProps = {
  children: ReactNode;
};

const BlogTitleButton = (props: BlogTitleButtonProps): JSX.Element => {
  return (
    <StyledButton size="small" color="inherit" href="/">
      {props.children}
    </StyledButton>
  );
};

const BlogTitle = (props: BlogTitleProps) => {
  return <BlogTitleButton>{props.siteTitle}</BlogTitleButton>;
};

export default BlogTitle;
