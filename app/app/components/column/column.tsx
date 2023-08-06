"use client";

import React from "react";
import classNames from "classnames/bind";
import styles from "./column.module.scss";
import { Icon } from "app/components/ui";
const cx = classNames.bind(styles);

interface IProps {
  className?: string;
  title?: string;
  description?: string;
  icon?: string;
  align?: string;
  fullWidth?: boolean;
}

const Column = ({
  className,
  title,
  description,
  icon,
  fullWidth,
  align,
}: IProps) => {
  const classes = cx(
    { column: true, fullWidth, alignRight: align === "right" },
    className,
  );
  return (
    <div className={classes}>
      {title && <h6 className={styles.title}>{title}</h6>}
      {description && <p className={styles.description}>{description}</p>}
      {icon && <Icon name={icon} width={40} height={40} />}
    </div>
  );
};

export default Column;
