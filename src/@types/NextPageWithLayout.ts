import { NextPage } from "next";
import { AppProps } from "next/app";
import { ReactElement, ReactNode } from "react";

type GetLayout = (page: ReactElement) => ReactNode;
type NextPageWithLayout<T> = NextPage<T> & {
  getLayout?: GetLayout;
};
type AppPropsWithLayout<T> = AppProps & {
  Component: NextPageWithLayout<T>;
};

export type { GetLayout, NextPageWithLayout, AppPropsWithLayout };
