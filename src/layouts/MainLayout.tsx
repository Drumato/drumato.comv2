import { Container, createTheme, ThemeProvider } from "@mui/material";
import { red, grey } from "@mui/material/colors";
import { ReactElement } from "react";
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

const MainLayout = ({ children }: Props): JSX.Element => {
  return (
    <ThemeProvider theme={theme}>
      <BlogHeader siteTitle={siteTitle} />
      <Container fixed>{children}</Container>
      <BlogFooter year={year} author={author} />
    </ThemeProvider>
  );
};

export default MainLayout;
