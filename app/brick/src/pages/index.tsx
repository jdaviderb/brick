import { ComingNext } from '@/components/pages/home/ComingNext'
import { HowWorks } from '@/components/pages/home/HowWorks'
import { MainPage } from '@/components/pages/home/MainPage'
import { PromoDemo } from '@/components/pages/home/PromoDemo'
import { UseCases } from '@/components/pages/home/UseCases'
import { WhyBrick } from '@/components/pages/home/WhyBrick'
import styles from '@/styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.home}>
      <MainPage/>
      <UseCases/>
      <HowWorks/>
      <WhyBrick/>
      <PromoDemo/>
      <ComingNext/>
    </div>
  )
}
