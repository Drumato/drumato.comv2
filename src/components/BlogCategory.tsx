import { Button, styled, Typography } from "@mui/material";
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
  const StyledTypography = styled(Typography)({
    fontSize: "12px",
    fontFamily: "Klee One",
    color: "#FFFFFF",
  });

  return <StyledTypography variant="h1">{props.content}</StyledTypography>;
};

const BlogCategory = (props: BlogCategoryProps): JSX.Element => {
  const { rawLocale: locale } = useLocale();
  const link = `/${locale}/${props.categoryInURL}`;

  const StyledButton = styled(Button)({
    height: "64px",
  });

  return (
    <StyledButton size="large" color="inherit" href={link}>
      <BlogCategoryTypography content={props.categoryName} />
    </StyledButton>
  );
};

export default BlogCategory;
