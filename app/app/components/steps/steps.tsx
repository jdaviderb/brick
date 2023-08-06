"use client";

import React from "react";
import classNames from "classnames/bind";
import styles from "./steps.module.scss";
import { Card } from "app/components/ui";
const cx = classNames.bind(styles);

interface IProps {
  className?: string;
  heading?: string;
  items?: [
    {
      title?: string;
      description?: string;
    },
  ];
}

const Steps = ({ className, heading, items }: IProps) => {
  const classes = cx({ steps: true }, className);
  return (
    <div className={classes}>
      {heading && <h3 className={styles.heading}>{heading}</h3>}
      {items && (
        <div className={styles.items}>
          {items.map((item, index) => (
            <Card className={styles.item} key={index}>
              <h6>
                {index + 1}. {item?.title}
              </h6>
              <p className={styles.description}>{item?.description}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Steps;
