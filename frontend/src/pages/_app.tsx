import type { AppProps } from 'next/app';
import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';
import "@/styles/globals.css";
import Layout from "@/components/common/Layout";
import { Provider } from 'react-redux';
import { store } from '@/store';

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  // If the page exports a custom getLayout, use it (e.g. MetaOffice full-screen)
  const getLayout = Component.getLayout ?? ((page) => <Layout>{page}</Layout>);
  return (
    <Provider store={store}>
      {getLayout(<Component {...pageProps} />)}
    </Provider>
  );
}

