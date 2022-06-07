import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { MouseEventHandler, useState } from "react";
import BlogTitle from "./BlogTitle";
import MenuIcon from "@mui/icons-material/Menu";
import useLocale from "~/hooks/useLocale";

type Props = {
  siteTitle: string;
};

type BlogHeaderDrawerButtonProps = {
  onClick: MouseEventHandler;
};

const BlogHeaderDrawerButton = (
  props: BlogHeaderDrawerButtonProps
): JSX.Element => {
  return (
    <IconButton aria-label="delete" color="secondary" onClick={props.onClick}>
      <MenuIcon />
    </IconButton>
  );
};

const BlogHeaderDrawItems = (): JSX.Element => {
  const { rawLocale, categories } = useLocale();
  return (
    <List>
      {Array.from(categories).map(([urlRepl, categoryName]) => {
        const categoryLink = `/${rawLocale}/${urlRepl}`;
        return (
          <ListItem key={urlRepl} disablePadding>
            <ListItemButton href={categoryLink}>
              <ListItemText
                primaryTypographyProps={{ fontFamily: "Klee One" }}
                primary={categoryName}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
};

const BlogHeaderInMobile = (props: Props): JSX.Element => {
  const [open, setOpen] = useState(false);
  const reverseOpenState = () => {
    setOpen(!open);
  };

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
            <BlogHeaderDrawerButton onClick={reverseOpenState} />
            <Drawer anchor="left" open={open} onClose={reverseOpenState}>
              <BlogHeaderDrawItems />
            </Drawer>
          </Stack>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default BlogHeaderInMobile;
