import styled from "@emotion/styled";
import { Theme } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import BlogCategory from "./BlogCategory";
import BlogTitle from "./BlogTitle";

type BlogHeaderProps = {
  siteTitle: string;
  categoryBaseDir: string;
};

const categories = [
  "about",
  "contacts",
  "disclaimer",
  "license",
  "post",
  "diary",
];

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
  return (
    <StyledBox sx={{ flexGrow: 1 }}>
      <StyledAppBar position="static">
        <StyledToolbar color="inherit">
          <>
            <BlogTitle siteTitle={props.siteTitle} />
            {categories.map((category) => {
              return (
                <BlogCategory
                  key={category}
                  categoryBaseDir={props.categoryBaseDir}
                  name={category}
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
