import styles from '@/styles/Home.module.css'

export const UseCases = () => {
    return (
        <div className={styles.section}>
            <div className={styles.useCasesSection}>
                <div className={styles.useCasesContainer}>
                    <div className={styles.useCase}>
                        <img src="/money-front-gradient.png" className={styles.useCaseImages} height="90" width="130"/>
                        <p>Monetize your app or services</p>
                    </div>
                    <div className={styles.useCase}>
                        <img src="/link-front-gradient.png" className={styles.useCaseImages} height="90" width="130"/>
                        <p>Use it as a token gating protocol</p>
                    </div>
                    <div className={styles.useCase}>
                        <img src="/bag-front-gradient.png" className={styles.useCaseImages} height="90" width="130"/>
                        <p>Manage inventory and payment method</p>
                    </div>
                </div>
            </div>
        </div>
    )
}