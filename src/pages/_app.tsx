import 'styles/globals.css'
import type { AppProps } from 'next/app'
import { ReactElement, ReactNode } from 'react';
import { NextPage } from 'next';
import { ChakraProvider } from '@chakra-ui/react';
import { extendTheme } from '@chakra-ui/react';

export type GetLayout = (page: ReactElement) => ReactNode;
export type NextPageWithLayout<T> = NextPage<T> & {
  getLayout?: GetLayout;
};
export type AppPropsWithLayout<T> = AppProps & {
  Component: NextPageWithLayout<T>;
};

const colors = {
  brand: {
    900: '#1a365d',
    800: '#153e75',
    700: '#2a69ac',
  },
  initialColorMode: 'light',
  useSystemColorMode: false,
};
const breakpoints = {
  sm: '30em',
  md: '48em',
  lg: '62em',
  xl: '80em',
  '2xl': '96em',
};

export const drumatoTheme = extendTheme({ colors, breakpoints });

const MyApp = ({ Component, pageProps }: AppPropsWithLayout<{}>): ReactNode => {
  const pageIdentity: GetLayout = (page) => page;
  const getLayout = Component.getLayout ?? pageIdentity;

  return <ChakraProvider theme={drumatoTheme}>
    {getLayout(<Component {...pageProps} />)}
  </ChakraProvider>;
};

export default MyApp;
