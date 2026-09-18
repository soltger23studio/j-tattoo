import type { PetRarity, PetSource } from '@/lib/types';
import { RARITY_LABELS, SOURCE_LABELS } from '@/lib/types';
import styles from './Filters.module.css';

export type StatusFilter = 'all' | 'owned' | 'missing';
export type SortOption = 'rarity' | 'name' | 'category';

export interface FilterState {
  search: string;
  status: StatusFilter;
  source: PetSource | 'all';
  rarity: PetRarity | 'all';
  category: string | 'all';
  sort: SortOption;
}

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  status: 'all',
  source: 'all',
  rarity: 'all',
  category: 'all',
  sort: 'rarity',
};

interface FiltersProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  categories: string[];
  sources: PetSource[];
  rarities: PetRarity[];
  resultCount: number;
  totalCount: number;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Összes' },
  { value: 'missing', label: 'Csak ami hiányzik' },
  { value: 'owned', label: 'Csak ami megvan' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'rarity', label: 'Ritkaság' },
  { value: 'name', label: 'Név (A-Z)' },
  { value: 'category', label: 'Kategória' },
];

export default function Filters({
  filters,
  onChange,
  categories,
  sources,
  rarities,
  resultCount,
  totalCount,
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
    filters.source !== DEFAULT_FILTERS.source ||
    filters.rarity !== DEFAULT_FILTERS.rarity ||
    filters.category !== DEFAULT_FILTERS.category;

  return (
    <section className={styles.wrapper} aria-label="Szűrők">
      <div className={styles.searchRow}>
        <input
          type="search"
          className={styles.search}
          placeholder="Keresés név, megszerzési mód vagy hely szerint…"
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

      <div className={styles.selects}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="filter-source">
            Megszerzés
          </label>
          <select
            id="filter-source"
            className={styles.select}
            value={filters.source}
            onChange={(event) =>
              update('source', event.target.value as PetSource | 'all')
            }
          >
            <option value="all">Mindegy</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {SOURCE_LABELS[source]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="filter-rarity">
            Ritkaság
          </label>
          <select
            id="filter-rarity"
            className={styles.select}
            value={filters.rarity}
            onChange={(event) =>
              update('rarity', event.target.value as PetRarity | 'all')
            }
          >
            <option value="all">Mindegy</option>
            {rarities.map((rarity) => (
              <option key={rarity} value={rarity}>
                {RARITY_LABELS[rarity]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="filter-category">
            Kategória
          </label>
          <select
            id="filter-category"
            className={styles.select}
            value={filters.category}
            onChange={(event) => update('category', event.target.value)}
          >
            <option value="all">Mindegy</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="filter-sort">
            Rendezés
          </label>
          <select
            id="filter-sort"
            className={styles.select}
            value={filters.sort}
            onChange={(event) =>
              update('sort', event.target.value as SortOption)
            }
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.footer}>
        <span>
          {resultCount} / {totalCount} pet látszik
        </span>
        {isFiltered && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
          >
            Szűrők törlése
          </button>
        )}
      </div>
    </section>
  );
}
