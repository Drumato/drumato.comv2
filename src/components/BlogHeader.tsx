import styled from "@emotion/styled";
import { Theme } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import BlogCategory from "./BlogCategory";
import BlogTitle from "./BlogTitle";
import useLocale from "~/hooks/useLocale";

type BlogHeaderProps = {
  siteTitle: string;
};

const StyledBox = styled(Box)({
  height: "64px",
});

const StyledAppBar = styled(AppBar)({
  height: "64px",
});

const StyledToolbar = styled(Toolbar)({
  height: "64px",
});

const BlogHeader = (props: BlogHeaderProps): JSX.Element => {
  const loc = useLocale();
  const categories = Array.from(loc.categories).map(([key, value]) => {
    return {
      // "post"
      urlElement: key,
      // "記事一覧"
      categoryName: value,
    };
  });

  return (
    <StyledBox sx={{ flexGrow: 1 }}>
      <StyledAppBar position="static">
        <StyledToolbar color="inherit">
          <>
            <BlogTitle siteTitle={props.siteTitle} />
            {categories.map((category) => {
              return (
                <BlogCategory
                  key={category.categoryName}
                  categoryInURL={category.urlElement}
                  categoryName={category.categoryName}
                ></BlogCategory>
              );
            })}
          </>
        </StyledToolbar>
      </StyledAppBar>
    </StyledBox>
  );
};

export default BlogHeader;
