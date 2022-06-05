import { Button, styled, Typography } from "@mui/material";

type BlogCategoryProps = {
  categoryBaseDir: string;
  name: string;
};

type BlogCategoryTypographyProps = {
  content: string;
};

const BlogCategoryTypography = (
  props: BlogCategoryTypographyProps
): JSX.Element => {
  const StyledTypography = styled(Typography)({
    fontSize: "14px",
    fontFamily: "Sawarabi Gothic",
    color: "#FFFFFF",
  });

  return <StyledTypography variant="h1">{props.content}</StyledTypography>;
};

const BlogCategory = (props: BlogCategoryProps): JSX.Element => {
  const link = `/${props.categoryBaseDir}/${props.name}`;

  const StyledButton = styled(Button)({
    height: "64px",
  });
  return (
    <StyledButton size="large" color="inherit" href={link}>
      <BlogCategoryTypography content={props.name} />
    </StyledButton>
  );
};

export default BlogCategory;
