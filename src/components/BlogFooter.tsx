import { styled, Typography } from "@mui/material";

type BlogFooterProps = {
  year: number;
  author: string;
};

type BlogFooterTypographyProps = {
  content: string;
};

const StyledTypography = styled(Typography)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: "10px",
  fontFamily: "Klee One",
});

const BlogFooterTypography = (
  props: BlogFooterTypographyProps
): JSX.Element => {
  return <StyledTypography variant="caption">{props.content}</StyledTypography>;
};

const BlogFooter = (props: BlogFooterProps): JSX.Element => {
  const copyright = `© ${props.year} ${props.author}`;

  return (
    <footer>
      <BlogFooterTypography content={copyright} />
    </footer>
  );
};

export default BlogFooter;
