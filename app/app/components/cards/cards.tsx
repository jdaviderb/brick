"use client";

import React from "react";
import classNames from "classnames/bind";
import styles from "./cards.module.scss";
import { Icon, Card } from "app/components/ui";
const cx = classNames.bind(styles);

interface IProps {
  className?: string;
  items?: [
    {
      icon?: React.ReactComponentElement<typeof Icon>;
      title?: string;
      description?: string;
    },
  ];
}

const Cards = ({ className, items }: IProps) => {
  const classes = cx({ cards: true }, className);
  return (
    <div className={classes}>
      <Icon name={"wall-bottom"} className={styles.layer} />
      <div className={styles.items}>
        {items?.map((item, index) => (
          <Card className={styles.item} key={index}>
            {item?.icon && (
              <div className={styles.background}>
                <Icon width={60} {...item?.icon} />
              </div>
            )}
            {(item?.title || item?.description) && (
              <div className={styles.content}>
                {item?.title && <h6>{item?.title}</h6>}
                {item?.description && (
                  <p className={styles.description}>{item?.description}</p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Cards;
