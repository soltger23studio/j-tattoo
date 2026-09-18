import styles from './Filters.module.css';

export type StatusFilter = 'all' | 'owned' | 'missing';

export interface FilterState {
  search: string;
  status: StatusFilter;
  /** Csak azok a petek, amiknél nem tudjuk, honnan szerezhetők. */
  onlyIncomplete: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  status: 'all',
  onlyIncomplete: false,
};

interface FiltersProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  resultCount: number;
  totalCount: number;
  /** Hány petnél nem tudjuk, honnan szerezhető. */
  incompleteCount: number;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Összes' },
  { value: 'missing', label: 'Csak ami hiányzik' },
  { value: 'owned', label: 'Csak ami megvan' },
];

export default function Filters({
  filters,
  onChange,
  resultCount,
  totalCount,
  incompleteCount,
}: FiltersProps) {
  const update = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const isFiltered =
    filters.search !== DEFAULT_FILTERS.search ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.onlyIncomplete !== DEFAULT_FILTERS.onlyIncomplete;

  return (
    <section className={styles.wrapper} aria-label="Szűrők">
      <div className={styles.searchRow}>
        <input
          type="search"
          className={styles.search}
          placeholder="Keresés név, NPC, esemény, kazamata vagy bónusz szerint…"
          value={filters.search}
          onChange={(event) => update('search', event.target.value)}
          aria-label="Keresés a petek között"
        />
      </div>

      <div className={styles.segmented} role="group" aria-label="Állapot szűrő">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`${styles.segment} ${
              filters.status === option.value ? styles.segmentActive : ''
            }`}
            aria-pressed={filters.status === option.value}
            onClick={() => update('status', option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {incompleteCount > 0 && (
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={filters.onlyIncomplete}
            onChange={(event) =>
              update('onlyIncomplete', event.target.checked)
            }
          />
          <span>
            Csak amiknél nincs megszerzési infó ({incompleteCount} db)
          </span>
        </label>
      )}

      <div className={styles.footer}>
        <span>
          {resultCount} / {totalCount} pet látszik
        </span>
        {isFiltered && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => onChange(DEFAULT_FILTERS)}
          >
            Szűrők törlése
          </button>
        )}
      </div>
    </section>
  );
}
