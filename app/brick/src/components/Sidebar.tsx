//import { AiOutlineClose } from "react-icons/ai";
import Link from "next/link";
import styles from "@/styles/components/Sidebar.module.css";
import Image from "next/image";
interface NavProps {
  NavItems: any;
  sidebar: boolean;
  showSidebar: any;
}

export const Sidebar = ({ NavItems, sidebar, showSidebar }: NavProps) => {
  return (
    <div
      onClick={() => showSidebar()}
      className={
        sidebar ? styles.sidebar_container_active : styles.sidebar_container
      }
    >
      <div className={styles.close_icon}>
        <Image
          alt="close icon" 
          src="/close-icon.svg"
          height="40"
          width="40" />
      </div>
      <div className={styles.sidebar_menu}>
        { NavItems.map(route => (
          <div className={styles.sidebar_links} key={route.key}>
            <Link href={route.url} onClick={() => showSidebar()}>
                <a>{route.label}</a>
            </Link>
          </div>
        ))}
      </div>
      <div className={styles.social_links}>
          <div className={styles.row}>
            <div className={styles.column}>
              <a href="https://twitter.com/BrickProtocol">
                  <Image
                    alt="twitter logo"
                    src="/twitter-square.svg"
                    height="85"
                    width="100" />
              </a>
            </div>
            <div className={styles.column}>
              <a href="https://github.com/ricardocr987/brick">
                <Image
                  alt="github logo"
                  src="/github-square.svg"
                  height="90"
                  width="100" />
              </a>
            </div>
          </div>
        </div>
    </div>
  );
};
export default Sidebar;
