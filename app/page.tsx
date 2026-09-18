import PetTracker from '@/components/PetTracker/PetTracker';
import SiteHeader from '@/components/SiteHeader/SiteHeader';
import { PETS } from '@/lib/pet-overrides';
import { IS_SAMPLE_DATA } from '@/lib/pets';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <SiteHeader showSampleWarning={IS_SAMPLE_DATA} />
      <PetTracker pets={PETS} />
      <footer className={styles.footer}>
        <p>
          A pipáid csak a saját böngésződben tárolódnak – nincs regisztráció, és
          semmilyen adat nem kerül szerverre.
        </p>
        <p>
          Hiányzik egy pet, vagy pontatlan a leírás? Szólj, és frissítjük a
          listát.
        </p>
      </footer>
    </main>
  );
}
