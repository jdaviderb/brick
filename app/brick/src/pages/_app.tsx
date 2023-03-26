import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head';
import { ContextProvider } from '@/components/contexts/ContextProvider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const NavItems = [
  { label: "Home", url: "https://brickprotocol.xyz", key: 1 },
  { label: "Sell", url: "https://brickprotocol.xyz/create", key: 2 },
  { label: "Buy", url: "https://brickprotocol.xyz/app", key: 3 },
  { label: "My tokens", url: "https://brickprotocol.xyz/tokens", key: 4 },
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
        <div className={getPageClass(Component)}>
          <Component {...pageProps} />
        </div>
        <Footer />
      </ContextProvider>
    </>
  );
}

function getPageClass(component: any) {
  if (component.name == 'Home') {
    return ''
  } else { 
    return 'container' 
  }
}