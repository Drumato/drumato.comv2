import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import BlogCategory from "./BlogCategory";
import BlogTitle from "./BlogTitle";
import useLocale from "~/hooks/useLocale";
import { Stack } from "@mui/material";
import useMobileMode from "~/hooks/useMobileMode";
import BlogHeaderInMobile from "./BlogHeaderInMobile";

type BlogHeaderProps = {
  siteTitle: string;
};

const BlogHeader = (props: BlogHeaderProps): JSX.Element => {
  const loc = useLocale();
  const isMobileMode = useMobileMode();
  console.log(isMobileMode);
  const categories = Array.from(loc.categories).map(([key, value]) => {
    return {
      // "post"
      urlElement: key,
      // "記事一覧"
      categoryName: value,
    };
  });

  if (isMobileMode) {
    return <BlogHeaderInMobile siteTitle={props.siteTitle} />;
  }

  return (
    <Box
      sx={{
        my: 4,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <AppBar position="fixed">
        <Toolbar color="inherit">
          <Stack direction="row" spacing={2}>
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
          </Stack>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default BlogHeader;
