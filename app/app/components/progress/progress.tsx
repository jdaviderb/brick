"use client";

import React from "react";
import classNames from "classnames/bind";
import styles from "./progress.module.scss";
import { Card, Icon } from "app/components/ui";
const cx = classNames.bind(styles);

interface IProps {
  className?: string;
  heading?: string;
  items?: [
    {
      title?: string;
      percentage?: number;
    },
  ];
}

const Progress = ({ className, heading, items }: IProps) => {
  const classes = cx({ progress: true }, className);

  return (
    <div className={classes}>
      {heading && <h3 className={styles.heading}>{heading}</h3>}
      {items?.map((item, index) => (
        <Card className={styles.item} key={index}>
          {(item?.title || item?.percentage) && (
            <div className={styles.content}>
              {item?.title && <h6>{item?.title}</h6>}
              {item?.percentage && (
                <div className={styles.bar}>
                  <div
                    className={[
                      styles.percentage,
                      item?.percentage === 100 ? styles.completed : "",
                    ].join(" ")}
                    style={{ width: `${item?.percentage}%` }}
                  ></div>
                </div>
              )}
              <span className={styles.description}>
                {item?.percentage === 100 ? "completed" : "in progress"}
              </span>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default Progress;
