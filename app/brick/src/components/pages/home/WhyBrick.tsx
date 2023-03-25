import styles from '@/styles/Home.module.css'

export const WhyBrick = () => {
    return (
        <div className={styles.section}>
            <div className={styles.whyBrickSection}>
                <div className={styles.whyTitleContainer}>Why not using a simple transfer:</div>
                    <div className={styles.whiteContainer}>
                        If your use case needs to be sure that some event has happened, indexing/fetching/parsing a transfer is much harder than using a program.
                    </div>
                    <div className={styles.whiteContainer}>
                        Think in a flight ticket, the ticket represents a promise from the seller that you are going to enter to the plane when you do the check-in. In this case this ticket flight could represents the token and the check-in the use_token instruction. Basically, makes sense if what you are tokenizing something that won't be consumed at the same moment that is paid.
                    </div>
                    <div className={styles.whiteContainer}>
                        You want to give refunds in an automatic way.
                    </div>
                    <div className={styles.whiteContainer}>
                        If you creates an app that aims to create a marketplace, with his protocol a fee could be enforced.
                    </div>
            </div>
        </div>
    )
}