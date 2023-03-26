import styles from '@/styles/Home.module.css'

export const HowWorks = () => {
    return (
        <div className={styles.section}>
            <div className={styles.howWorksSection}>
                <div className={styles.howWorksTitleContainer}>How it works:</div>
                <img src="/on_chain.png" className={styles.onChainImg}/>
                <div className={styles.verticalLine}>
                    <div className={styles.circle}>1</div>
                    <div className={styles.circle}>2</div>
                    <div className={styles.circle}>3</div>
                    <div className={styles.circle}>4</div>
                    <div className={styles.circle}>5</div>
                </div>
                <div className={styles.howWorksTextContainer}>
                    <div className={styles.whyTextContainer}>
                        <div className={styles.howWorksSubtitle}>Set the price of what you are tokenizing.</div>
                    </div>
                    <div className={styles.whyTextContainer}>
                        <div className={styles.howWorksSubtitle}>Set the token you want to receive in the sale, you can even get paid in BONK.</div>
                    </div>
                    <div className={styles.whyTextContainer}>
                        <div className={styles.howWorksSubtitle}>Choose between an unlimited or limited sale. In the case of a limited sale, define how many sales you want to make.</div>
                    </div>
                    <div className={styles.whyTextContainer}>
                        <div className={styles.howWorksSubtitle}>Set the time period during which the buyer can get a refund. If the buyer burns the token, they won't be able to access the funds, and you will have to wait that time to withdraw the funds.</div>
                    </div>
                    <div className={styles.whyTextContainer}>
                        <div className={styles.howWorksSubtitle}>If you are building an app that aims to create a marketplace, you have the option to set fees to the permissionless market you are creating.</div>
                    </div>
                </div>
                <div className={styles.howWorksSectionSquare}/>
                <div className={styles.howWorksSectionMediumSquare}/>
                <div className={styles.howWorksSectionSmallSquare}/>
            </div>
        </div>
    )
}