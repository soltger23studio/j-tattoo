import styles from './ProgressPanel.module.css';

export interface BreakdownEntry {
  label: string;
  owned: number;
  total: number;
}

interface ProgressPanelProps {
  owned: number;
  total: number;
  breakdown: BreakdownEntry[];
  /** SSR alatt / betöltés előtt 0-t mutatunk, hogy ne ugráljon a szám. */
  loaded: boolean;
}

function percent(owned: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((owned / total) * 100);
}

export default function ProgressPanel({
  owned,
  total,
  breakdown,
  loaded,
}: ProgressPanelProps) {
  const shownOwned = loaded ? owned : 0;
  const overall = percent(shownOwned, total);

  return (
    <section className={styles.panel} aria-label="Gyűjtemény haladás">
      <div className={styles.top}>
        <div>
          <div className={styles.headline}>A te gyűjteményed</div>
          <span className={styles.count}>
            {shownOwned} / {total}
          </span>{' '}
          <span className={styles.percent}>pet megvan ({overall}%)</span>
        </div>
        {loaded && shownOwned === total && total > 0 && (
          <span className={styles.percent}>Teljes gyűjtemény! 🏆</span>
        )}
      </div>

      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={overall}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Összesített haladás"
      >
        <div className={styles.fill} style={{ width: `${overall}%` }} />
      </div>

      <ul className={styles.breakdown}>
        {breakdown.map((entry) => {
          const value = loaded ? entry.owned : 0;
          const ratio = percent(value, entry.total);
          const isComplete = entry.total > 0 && value === entry.total;
          return (
            <li
              key={entry.label}
              className={`${styles.row} ${isComplete ? styles.complete : ''}`}
            >
              <div className={styles.rowTop}>
                <span className={styles.rowLabel}>{entry.label}</span>
                <span className={styles.rowCount}>
                  {value} / {entry.total}
                </span>
              </div>
              <div className={styles.miniTrack}>
                <div className={styles.miniFill} style={{ width: `${ratio}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
