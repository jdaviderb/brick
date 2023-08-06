"use client";

import React from "react";
import Link from "next/link";
import classNames from "classnames/bind";
import styles from "./footer.module.scss";
import { Icon } from "app/components/ui";
const cx = classNames.bind(styles);

interface IProps {
  className?: string;
  items?: [
    {
      title?: string;
      column?: [
        {
          url?: string;
          link?: string;
        },
      ];
    },
  ];
  socials?: [];
}

const Footer = ({ className, items, socials }: IProps) => {
  const classes = cx({ footer: true }, className);
  return (
    <footer className={classes}>
      <div className={styles.wrapper}>
        <div className={styles.iconsWrapper}>
          <div className={styles.logo}>
            <Icon name={"logo"} width={60} height={60} />
            <h6>Brick Protocol</h6>
          </div>
          {socials && (
            <div className={styles.socials}>
              {socials.map((item, index) => (
                <Link key={index} href={item?.href} className={styles.social}>
                  <Icon {...item} />
                </Link>
              ))}
            </div>
          )}
        </div>
        {items && (
          <div className={styles.items}>
            {items.map((item, index) => (
              <div key={index}>
                {item?.title && <h6 className={styles.title}>{item?.title}</h6>}
                {item?.column && (
                  <div className={styles.column}>
                    {item?.column?.map((column, i) => (
                      <Link key={i} href={column?.url} className={styles.link}>
                        {column?.link}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;
