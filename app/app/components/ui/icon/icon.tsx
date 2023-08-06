import { ReactSVG } from "react-svg";
import { css } from "glamor";

interface IProps {
  className?: string;
  name?: string;
  width?: number;
  height?: number;
}

const Icon = ({ className, name, width, height }: IProps) => {
  const styles = css({
    " svg": {
      height: height,
      width: width,
      color: "white",
    },
  });
  return <ReactSVG className={className} src={`${name}.svg`} {...styles} />;
};

export default Icon;
