"use client";

import styles from "./styles/page.module.scss";
import {
  dataCards,
  dataColumn1,
  dataColumn2,
  dataColumn3,
  dataCta,
  dataHero,
  dataProgress,
  dataSteps,
  dataPartners,
} from "./utils/data";
import {
  Hero,
  Steps,
  Cta,
  Cards,
  Progress,
  Column,
  Partners,
} from "app/components";

import Fade from "react-reveal/Fade";

export default function Home() {
  return (
    <main className={styles.main}>
      <Fade>
        <Hero {...dataHero} />
        <Column fullWidth {...dataColumn1} />
        <Cta {...dataCta} />
        <Steps {...dataSteps} />
        <Column align="right" {...dataColumn2} />
        <Column {...dataColumn3} />
        <Cards {...dataCards} />
        <Partners {...dataPartners} />
        <Progress {...dataProgress} />
      </Fade>
    </main>
  );
}
