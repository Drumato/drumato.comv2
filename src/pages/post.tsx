import { TableContainer, Table, Thead, Tr, Th, Tbody, Td } from '@chakra-ui/react';
import Head from 'next/head'
import { ReactElement, ReactNode } from 'react';
import useLocale from '~/hooks/useLocale';
import MainLayout from '~/layouts/MainLayout';
import { SupportedLocaleJapanese } from '~/utils/locale/supported';
import { NextPageWithLayout } from './_app'

const PostList: NextPageWithLayout<{}> = () => {
  const locale = useLocale();
  const title = locale.rawLocale === SupportedLocaleJapanese ? "記事一覧" : "post";

  return (
    <>
      <Head>
        <title>{title} | drumato.com</title>
      </Head>

      <div>
        <TableContainer>
          <Table variant='simple'>
            <Thead>
              <Tr>
                <Th>記事名</Th>
                <Th>投稿日時</Th>
              </Tr>
            </Thead>
            <Tbody>
              <Tr>
                <Td>記事1</Td>
                <Td>今日</Td>
              </Tr>
              <Tr>
                <Td>記事2</Td>
                <Td>明日</Td>
              </Tr>
              <Tr>
                <Td>記事3</Td>
                <Td>明後日</Td>
              </Tr>
            </Tbody>
          </Table>
        </TableContainer>
      </div>
    </>
  )
};

PostList.getLayout = (page: ReactElement): ReactNode => {
  return <MainLayout>
    {page}
  </MainLayout>;
};

export default PostList;
