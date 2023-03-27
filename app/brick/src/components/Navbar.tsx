import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import styles from "@/styles/components/Navbar.module.css";
import Link from 'next/link';
import Image from "next/image";
import dynamic from 'next/dynamic'
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

interface NavProps {
  NavItems: { label: string; url: string, key: number }[];
}

export const Navbar = ({ NavItems }: NavProps) => {
  const [sidebar, setSidebar] = useState(false);
  const showSidebar = () => setSidebar(!sidebar);

  const [navbar, setNavbar] = useState(false);
  useEffect(() => {
    window.addEventListener("scroll", changeBackground);
  });
  
  const changeBackground = () => {
    if (window.scrollY >= 80) {
      setNavbar(true);
    } else {
      setNavbar(false);
    }
  };

  return (
    <>
      <div className={styles.nav}>
        <div
          className={
            sidebar
              ? styles.hide : navbar
              ? styles.navbar_container_active : styles.navbar_container
          }
        >
          <div className={styles.navbar_logo}>
          </div>

          <div className={styles.mobile_icon} onClick={() => showSidebar()}>
            <Image alt="burguer" src="/menu-burguer-icon.svg" height="30" width="30"/>
          </div>

          <div className={styles.nav_menu}>
            { NavItems.map(route => (
                <div className={styles.nav_item} key={route.label}>
                  <Link href={route.url} passHref legacyBehavior>
                    <div className={styles.nav_links} key={route.key}>
                      <a>{route.label}</a>
                    </div>
                  </Link>
                </div>
            ))}
          </div>
          <div className={styles.connect_wallet}>
            <WalletMultiButtonDynamic />
          </div>
        </div>
      </div>
      <Sidebar
        NavItems={NavItems}
        sidebar={sidebar}
        showSidebar={showSidebar}
      />
    </>
  );
};

export default Navbar;
