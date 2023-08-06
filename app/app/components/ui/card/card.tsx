"use client";
import React from "react";
import classNames from "classnames/bind";
import styles from "./card.module.scss";
import { Icon } from "app/components/ui";

const cx = classNames.bind(styles);

interface IProps {
  icon?: React.ReactComponentElement<typeof Icon>;
  title?: string;
  description?: string;
  outline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const Card = ({
  icon,
  title,
  description,
  outline,
  className,
  children,
}: IProps) => {
  const classes = cx({ card: true, outline }, className);
  return (
    <div className={classes}>
      {icon && <Icon {...icon} />}
      {(title || description) && (
        <div className={styles.wrapper}>
          {title && <h6 className={styles.title}>{title}</h6>}
          {description && <p>{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
