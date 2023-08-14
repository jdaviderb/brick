"use client";

import React from "react";
import classNames from "classnames/bind";
import styles from "./partners.module.scss";
import { Icon } from "app/components/ui";
import Link from "next/link";
const cx = classNames.bind(styles);

interface IProps {
  className?: string;
  heading?: string;
  items?: [
    {
      icon?: string;
      href?: string;
    },
  ];
}

const Partners = ({ className, heading, items }: IProps) => {
  const classes = cx({ partners: true }, className);

  return (
    <div className={classes}>
      {heading && <h3 className={styles.heading}>{heading}</h3>}
      {items && (
      <div className={styles.items}>
        {items.map((item, index) => (
          <Link key={index} href={item?.href}>
            {item?.icon && (
              <Icon name={item.icon} className={styles.item} height={160} width={160} />
            )}
          </Link>
        ))}
      </div>
    )}
    </div>
  );
};

export default Partners;
