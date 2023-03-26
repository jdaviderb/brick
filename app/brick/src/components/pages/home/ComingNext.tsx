import styles from '@/styles/Home.module.css'

export const ComingNext = () => {
    return (
        <div className={styles.section}>
            <div className={styles.comingNextSection}>
                <div className={styles.featuresTitle}>Features coming:</div>
                <div className={styles.features}>
                    <div className={styles.feature}>
                        Ecosystem integration: Account compression and clockwork automation
                    </div>
                    <div className={styles.feature}>
                        Public indexer
                    </div>
                    <div className={styles.feature}>
                        TS library and rust crate
                    </div>
                    <div className={styles.feature}>
                        Invoice processing platform
                    </div>
                </div>
            </div>
        </div>
    )
}