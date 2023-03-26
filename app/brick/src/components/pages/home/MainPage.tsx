import styles from '@/styles/Home.module.css'
import Image from "next/image";

export const MainPage = () => {
    return (
        <div className={styles.section}>
            <div className={styles.mainSection}>
                <div className={styles.homeTitleContainer}>
                    <div className={styles.homeTitle}>Monetize and build</div>
                    <div className={styles.homeTitle}>your app using Brick</div>
                    <div className={styles.homeSubtitle}>Brick is a configurable payment protocol</div>
                    <div className={styles.homeSubtitle}>Monetize your app, service, good or asset</div>
                    <div className={styles.iconsContainer}>
                        <a href="https://twitter.com/BrickProtocol" className={styles.icon}>
                            <Image 
                                alt="twitter logo"
                                src="/twitter-square.svg"
                                height="85"
                                width="100" />
                        </a>
                        <a href="https://github.com/ricardocr987/brick" className={styles.icon}>
                            <Image
                                alt="github logo"
                                src="/github-square.svg"
                                height="95"
                                width="100" />
                        </a>
                    </div>
                </div>
                <div className={styles.walletImage}>
                    <Image height="500" width="500" alt="on chain" src="/Wallet.svg"/>
                </div>
                <div className={styles.mainSectionCircle}/>
                <div className={styles.mainSectionSquare}/>
                <div className={styles.mainSectionMediumSquare}/>
                <div className={styles.mainSectionSmallSquare}/>
            </div>
        </div>
    )
}