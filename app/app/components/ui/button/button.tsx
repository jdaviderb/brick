"use client";

import React from "react";
import classNames from "classnames/bind";
import styles from "./button.module.scss";
import Link from "next/link";

const cx = classNames.bind(styles);

interface IProps {
  className?: string;
  href?: string;
  text?: string;
  outline?: boolean;
}

const Button = ({ className, href, text, outline }: IProps) => {
  const classes = cx({ button: true, outline }, className);

  return (
    <div>
      {href && text && (
        <Link className={classes} href={href}>
          <span>{text}</span>
        </Link>
      )}
    </div>
  );
};

export default Button;
