import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import BlogCategory from "./BlogCategory";
import BlogTitle from "./BlogTitle";
import useLocale from "~/hooks/useLocale";
import { Stack } from "@mui/material";
import useMobileMode from "~/hooks/useMobileMode";
import BlogHeaderInMobile from "./BlogHeaderInMobile";
import { categoryPath } from "~/utils/siteLink";
import { japanese } from "~/locales/supported";

type BlogHeaderProps = {
  siteTitle: string;
};

const BlogHeader = (props: BlogHeaderProps): JSX.Element => {
  const loc = useLocale();
  const isMobileMode = useMobileMode();
  if (isMobileMode) {
    return <BlogHeaderInMobile siteTitle={props.siteTitle} />;
  }

  const categories = Array.from(loc.categories).map(([key, value]) => {
    return {
      // "post"
      urlElement: key,
      // "記事一覧"
      categoryName: value,
    };
  });

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
              const path = categoryPath(loc.rawLocale, category.urlElement);

              return (
                <BlogCategory
                  key={category.categoryName}
                  categoryName={category.categoryName}
                  categoryPath={path}
                ></BlogCategory>
              );
            })}

            <BlogCategory
              categoryName={loc.rawLocale === japanese ? "ENGLISH" : "日本語"}
              categoryPath={loc.rawLocale === japanese ? "/en" : "/ja"}
            ></BlogCategory>
          </Stack>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default BlogHeader;
