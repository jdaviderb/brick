"use client";
import React from "react";
import classNames from "classnames/bind";
import styles from "./slider.module.scss";
import { Icon } from "app/components/ui";
import ReactSlider from "react-slick";
import "slick-carousel/slick/slick.css";

import "slick-carousel/slick/slick-theme.css";
const cx = classNames.bind(styles);

interface IProps {
  className?: string;
  items?: [
    {
      icon?: string;
    },
  ];
}

const Slider = ({ className, items }: IProps) => {
  const classes = cx({ slider: true }, className);
  const settings = {
    dots: false,
    arrows: false,
    infinite: true,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    speed: 2500,
    autoplaySpeed: 0,
    cssEase: "linear",
    pauseOnHover: false,
  };

  return (
    <div className={classes}>
      <ReactSlider {...settings}>
        {items?.map((item, index) => (
          <Icon key={index} name={item?.icon} width={140} height={60} />
        ))}
      </ReactSlider>
    </div>
  );
};

export default Slider;
