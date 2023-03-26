import styles from "@/styles/components/Footer.module.css";
import Image from "next/image";

export const Footer = () => {
  return (
    <div className={styles.color__section}>
      <div className={styles.row}>
        <div className={styles.column}>
          <a href="https://twitter.com/BrickProtocol">
              <Image
                alt="twitter logo"
                src="/twitter-square.svg"
                height="50"
                width="100" />
          </a>
        </div>
        <div className={styles.column}>
          <a href="https://github.com/ricardocr987/brick">
              <Image
                  alt="github logo"
                  src="/github-square.svg"
                  height="55"
                  width="100" />
          </a>
        </div>
      </div>
    </div>
  );
};
