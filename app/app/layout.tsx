import "./styles/globals.scss";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Footer } from "app/components";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brick Protocol",
  description: "Monetize your product or service on Solana",
};

const dataFooter = {
  socials: [
    {
      name: "twitter",
      href: "https://twitter.com/BrickProtocol",
      width: 28,
      height: 28,
    },
  ],
  items: [
    {
      title: "Resources",
      column: [
        {
          link: "Documentation",
          url: "https://brick-protocol.gitbook.io/docs/",
        },
        {
          link: "Github",
          url: "https://github.com/ricardocr987/brick",
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Footer {...dataFooter} />
      </body>
    </html>
  );
}
