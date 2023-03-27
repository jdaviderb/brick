import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head';
import { ContextProvider } from '@/components/contexts/ContextProvider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const NavItems = [
  { label: "Home", url: "", key: 1 },
  { label: "Sell", url: "/create", key: 2 },
  { label: "Buy", url: "/app", key: 3 },
  { label: "My tokens", url: "/tokens", key: 4 },
];

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Brick</title>
        <meta name="description" content="Tokenize any service or off-chain asset" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ContextProvider>
        <Navbar NavItems={NavItems} />
        <Component {...pageProps} />
        <Footer />
      </ContextProvider>
    </>
  );
}