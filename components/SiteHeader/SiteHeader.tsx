import styles from './SiteHeader.module.css';

interface SiteHeaderProps {
  showSampleWarning: boolean;
}

export default function SiteHeader({ showSampleWarning }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>
        Pet <span className={styles.accent}>Gyűjtemény</span>
      </h1>
      <p className={styles.subtitle}>
        A szerver összes petje egy helyen: honnan szerezhető meg, és milyen
        bónuszt ad. Pipáld ki, melyik van már meg – szűrj arra, ami hiányzik.
      </p>
      {showSampleWarning && (
        <div className={styles.banner}>
          <span className={styles.bannerLabel}>Példaadatok</span>{' '}
          <span>
            Az itt látható petek csak minták, hogy lásd, hogyan működik az oldal.
            Az igazi lista a <code>lib/pets.ts</code> fájlban cserélhető ki.
          </span>
        </div>
      )}
    </header>
  );
}
