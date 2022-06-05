import { createTheme, ThemeProvider } from "@mui/material";
import { red, grey } from "@mui/material/colors";
import { Theme, ThemeOptions } from "@mui/material/styles";
import { FC, ReactElement } from "react";
import BlogFooter from "~/components/BlogFooter";
import BlogHeader from "~/components/BlogHeader";

type Props = {
  children: ReactElement;
};

const theme = createTheme({
  palette: {
    primary: {
      main: red[200],
    },
    secondary: {
      main: grey[50],
    },
    // mode: 'light' | 'dark',
  },
});

const siteTitle = "drumato.com";
const year = 2022;
const author = "Drumato";

const MainLayout = ({ children }: Props) => {
  return (
    <ThemeProvider theme={theme}>
      <BlogHeader siteTitle={siteTitle} categoryBaseDir={"ja"} />
      {children}
      <BlogFooter year={year} author={author} />
    </ThemeProvider>
  );
};

export default MainLayout;
