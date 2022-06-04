import styled from "@emotion/styled";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import { ReactNode } from "react";
import BlogCategoryList from "./BlogCategoryList";
import BlogTitle from "./BlogTitle";

type BlogHeaderProps = {
  siteTitle: string;
  categoryBaseDir: string;
};

const BlogHeader = (props: BlogHeaderProps): JSX.Element => {
  const categories = [
    "about",
    "contacts",
    "disclaimer",
    "license",
    "post",
    "diary",
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <BlogTitle siteTitle={props.siteTitle} />
          <BlogCategoryList
            categoryBaseDir={props.categoryBaseDir}
            categories={categories}
          />
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default BlogHeader;
