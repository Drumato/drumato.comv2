import { Button, styled, Typography } from "@mui/material";

type BlogCategoryProps = {
  categoryBaseDir: string;
  name: string;
};

type BlogCategoryTypographyProps = {
  content: string;
};

const StyledTypography = styled(Typography)({
  fontSize: "14px",
  fontFamily: "Sawarabi Gothic",
});

const BlogCategoryTypography = (
  props: BlogCategoryTypographyProps
): JSX.Element => {
  return <StyledTypography variant="h1">{props.content}</StyledTypography>;
};

const BlogCategory = (props: BlogCategoryProps): JSX.Element => {
  const link = `/${props.categoryBaseDir}/${props.name}`;

  return (
    <Button size="large" color="inherit" href={link}>
      <BlogCategoryTypography content={props.name} />
    </Button>
  );
};

export default BlogCategory;
