import styles from '@/styles/Home.module.css'

export const UseCases = () => {
    return (
        <div className={styles.section}>
            <div className={styles.useCasesSection}>
                <div className={styles.useCasesContainer}>
                    <div className={styles.useCase}>
                        <img
                            src="/money-front-gradient.png"
                            height="90"
                            width="130"
                            alt="GitHub Icon"
                        />
                    </div>
                    <div className={styles.useCase}>
                        <img
                            src="/link-front-gradient.png"
                            height="90"
                            width="130"
                            alt="GitHub Icon"
                        />
                    </div>
                    <div className={styles.useCase}>
                        <img
                            src="/bag-front-gradient.png"
                            height="90"
                            width="130"
                            alt="GitHub Icon"
                        />
                    </div>
                </div>
                <div className={styles.textUseCasesContainer}>
                    <div className={styles.textUseCase}>Monetize your app or service</div>
                    <div className={styles.textUseCase}>Fetch easily on-chain data with our indexer (Soon)</div>
                    <div className={styles.textUseCase}>Brick is a configurable payment protocol</div>
                </div>
            </div>
        </div>
    )
}