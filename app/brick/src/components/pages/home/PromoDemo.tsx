import styles from '@/styles/Home.module.css'
import Link from 'next/link'
import Image from "next/image";

export const PromoDemo = () => {
    return (
        <div className={styles.section}>
            <div className={styles.promoDemoSection}>
                <div className={styles.promoTitleContainer}>Monetize your product with Brick</div>
                <div className={styles.promoTitleContainer}>The Solana program is already on mainnet</div>
                <div className={styles.promoTitleContainer}>Check how the protocol works with this demo:</div>
                <Image height="300" width="300" alt="business" src="/business.png" className={styles.bussinesImg}/>
                <div className={styles.verticalLine}>
                    <div className={styles.circle}>1</div>
                    <div className={styles.circle}>2</div>
                    <div className={styles.circle}>3</div>
                    <div className={styles.circle}>4</div>
                </div>
                <div className={styles.promoTextContainer}>
                    <div className={styles.promoInnerTextContainer}>
                        <div className={styles.promoSubtitle}>Create an application account</div>
                        <Link href='https://brickprotocol.xyz/create' passHref><button className={styles.button}>CREATE APP</button></Link>
                    </div>
                    <div className={styles.promoInnerTextContainer}>
                        <div className={styles.promoSubtitle}>Create a token with its respective configuration</div>
                        <Link href='https://brickprotocol.xyz/create' passHref><button className={styles.button}>CREATE TOKEN</button></Link>
                    </div>
                    <div className={styles.promoInnerTextContainer}>
                        <div className={styles.promoSubtitle}>Find your app from the list and buy your own token</div>
                        <Link href='https://brickprotocol.xyz/app' passHref><button className={styles.button}>FIND YOUR APP</button></Link>
                    </div>
                    <div className={styles.promoInnerTextContainer}>
                        <div className={styles.promoSubtitle}>
                            My Tokens page shows the tokens listed by you and the tokens you have purchased using Brick, the functionalities of this page allow you to:
                        </div>
                        <div className={styles.promoSubtitle}>
                            - As a seller: delete, receive, withdraw and modify the price.
                        </div>
                        <div className={styles.promoSubtitle}>
                            - As a buyer: request a refund and burn the token. 
                        </div>
                        <Link href='https://brickprotocol.xyz/tokens' passHref><button className={styles.button}>MY TOKENS</button></Link>
                    </div>
                </div>
            </div>
        </div>
    )
}