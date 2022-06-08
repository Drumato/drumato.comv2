import { Button, Typography } from "@mui/material";

type BlogCategoryProps = {
  categoryName: string;
  categoryPath: string;
};

type BlogCategoryTypographyProps = {
  content: string;
};

const BlogCategoryTypography = (
  props: BlogCategoryTypographyProps
): JSX.Element => {
  return (
    <Typography
      fontWeight="bold"
      variant="subtitle1"
      color="secondary"
      fontFamily="Klee One"
    >
      {props.content}
    </Typography>
  );
};

const BlogCategory = (props: BlogCategoryProps): JSX.Element => {
  return (
    <Button size="small" color="inherit" href={props.categoryPath}>
      <BlogCategoryTypography content={props.categoryName} />
    </Button>
  );
};

export default BlogCategory;
