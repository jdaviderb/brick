import styles from '@/styles/Home.module.css'

export const WhyBrick = () => {
    return (
        <div className={styles.section}>
            <div className={styles.whyBrickSection}>
                <div className={styles.whyTitleContainer}>Why not using a simple transfer:</div>
                <div className={styles.contentContainer}>
                    <img src="/tick-front-gradient.png" className={styles.tickImage}/>
                    <div className={styles.whiteContainer}>
                        Tokenizing makes sense for delayed consumption. Think of a flight ticket: it represents a promise that you'll enter the plane when you check in. The ticket is the token and the check-in is burning the token.
                    </div>
                </div>
                <div className={styles.contentContainer}>
                    <img src="/tick-front-gradient.png" className={styles.tickImage}/>
                    <div className={styles.whiteContainer}>
                        If your use case needs to be sure that some event has happened, indexing a transfer is harder than using a custom program.
                    </div>
                </div>
                <div className={styles.contentContainer}>
                    <img src="/tick-front-gradient.png" className={styles.tickImage}/>
                    <div className={styles.whiteContainer}>
                        You want to automate refunds and streamline your business operations.
                    </div>
                </div>
                <div className={styles.contentContainer}>
                    <img src="/tick-front-gradient.png" className={styles.tickImage}/>
                    <div className={styles.whiteContainer}>
                        If you creates an app that aims to create a marketplace, with this protocol a fee could be enforced.
                    </div>
                </div>
            </div>
        </div>
    )
}