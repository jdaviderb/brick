import styles from '@/styles/Home.module.css'
import Image from "next/image";

export const UseCases = () => {
    return (
        <div className={styles.section}>
            <div className={styles.useCasesSection}>
                <div className={styles.useCasesContainer}>
                    <div className={styles.useCase}>
                        <div className={styles.useCaseImages}>
                            <Image alt="money" src="/money-front-gradient.svg" height="90" width="90"/>
                        </div>
                        <p>Monetize your app or services</p>
                    </div>
                    <div className={styles.useCase}>
                        <div className={styles.useCaseImages}>
                            <Image alt="link" src="/link-front-gradient.svg" height="90" width="90"/>
                        </div>
                        <p>Use it as a token gating protocol</p>
                    </div>
                    <div className={styles.useCase}>
                        <div className={styles.useCaseImages}>
                            <Image alt="bag" src="/bag-front-gradient.svg" height="90" width="90"/>
                        </div>
                        <p>Manage inventory and payment method</p>
                    </div>
                </div>
            </div>
        </div>
    )
}