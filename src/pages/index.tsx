import { Heading } from '@chakra-ui/react';
import Head from 'next/head';
import { ReactElement, ReactNode } from 'react';
import MainLayout from '~/layouts/MainLayout';
import { NextPageWithLayout } from './_app'

const Home: NextPageWithLayout<{}> = () => {
  return (
    <>
      <Head>
        <title>drumato.com</title>
      </Head>
      <Heading m={4} as="h1">drumato.com</Heading>
      <hr />

      <Heading m={4} as="h2">
        このサイトの
      </Heading>
    </>
  )
};

Home.getLayout = (page: ReactElement): ReactNode => {
  return <MainLayout>
    {page}
  </MainLayout>;
};

export default Home
