"use client";

import React from "react";
import classNames from "classnames/bind";
import styles from "./hero.module.scss";
import { Icon, Card, Button } from "app/components/ui";
const cx = classNames.bind(styles);
import Spline from "@splinetool/react-spline";

interface IProps {
  className?: string;
  title?: string;
  description?: string;
  href?: string;
  items?: [React.ReactComponentElement<typeof Card>];
}

const Hero = ({ className, title, description, href, items }: IProps) => {
  const classes = cx({ hero: true }, className);
  return (
    <div className={classes}>
      <div className={styles.content}>
        <div className={styles.titleWrapper}>
          <Spline
            scene="https://prod.spline.design/SbC-vcycj798iWIM/scene.splinecode"
            style={{ height: 260 }}
            className={styles.logo3d}
          />
          <Icon
            name={"logo"}
            width={80}
            height={80}
            className={styles.logo2d}
          />
          {title && <h1>{title}</h1>}
        </div>
        {description && <h5 className={styles.description}>{description}</h5>}
        {href && <Button href={href} text={"Launch"} outline />}
      </div>
      {items && (
        <div className={styles.items}>
          {items.map((item, index) => (
            <Card key={index} className={styles.item} outline {...item} />
          ))}
        </div>
      )}
      <p>Powered by</p>
      <Icon name={"solana"} height={50} width={160} />
      <Icon className={styles.layer} name={"layer"} />
    </div>
  );
};

export default Hero;
