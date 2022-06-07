import { Button, Typography } from "@mui/material";
import useLocale from "~/hooks/useLocale";

type BlogCategoryProps = {
  categoryInURL: string;
  categoryName: string;
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
  const { rawLocale: locale } = useLocale();
  const link = `/${locale}/${props.categoryInURL}`;

  return (
    <Button size="small" color="inherit" href={link}>
      <BlogCategoryTypography content={props.categoryName} />
    </Button>
  );
};

export default BlogCategory;
