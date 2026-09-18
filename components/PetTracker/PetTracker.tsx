'use client';

import { useMemo, useState } from 'react';
import CollectionTools from '@/components/CollectionTools/CollectionTools';
import Filters, {
  DEFAULT_FILTERS,
  type FilterState,
} from '@/components/Filters/Filters';
import PetCard from '@/components/PetCard/PetCard';
import PetTable from '@/components/PetTable/PetTable';
import ProgressPanel, {
  type BreakdownEntry,
} from '@/components/ProgressPanel/ProgressPanel';
import { GROUPS, groupOf } from '@/lib/groups';
import type { Pet } from '@/lib/types';
import { RARITY_ORDER, isIncomplete } from '@/lib/types';
import { useCollection } from '@/lib/useCollection';
import styles from './PetTracker.module.css';

/** Ékezet-független kereséshez: "Hóember" -> "hoember". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function searchableText(pet: Pet): string {
  return normalize(
    [
      pet.name,
      pet.category,
      pet.howToGet ?? '',
      pet.location ?? '',
      pet.notes ?? '',
      ...(pet.bonuses ?? []),
    ].join(' '),
  );
}

interface PetTrackerProps {
  pets: Pet[];
}

export default function PetTracker({ pets }: PetTrackerProps) {
  const { owned, loaded, toggle, markMany, replaceAll, reset } = useCollection();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [group, setGroup] = useState<string>('all');

  /** Ékezet-független kereső-index, hogy gépelés közben ne kelljen
   *  minden petnél újra összefűzni a kereshető szöveget. */
  const searchIndex = useMemo(() => {
    const index = new Map<string, string>();
    for (const pet of pets) index.set(pet.id, searchableText(pet));
    return index;
  }, [pets]);

  /** Melyik pet melyik fülre tartozik, és melyik fülön hány pet van. */
  const { groupById, groupCounts } = useMemo(() => {
    const byId = new Map<string, string>();
    const counts = new Map<string, number>();
    for (const pet of pets) {
      const id = groupOf(pet);
      byId.set(pet.id, id);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return { groupById: byId, groupCounts: counts };
  }, [pets]);

  const visiblePets = useMemo(() => {
    const query = normalize(filters.search.trim());

    const filtered = pets.filter((pet) => {
      if (group !== 'all' && groupById.get(pet.id) !== group) return false;
      if (query && !(searchIndex.get(pet.id) ?? '').includes(query)) {
        return false;
      }
      if (filters.status === 'owned' && !owned.has(pet.id)) return false;
      if (filters.status === 'missing' && owned.has(pet.id)) return false;
      if (filters.onlyIncomplete && !isIncomplete(pet)) return false;
      return true;
    });

    // Fix sorrend: ritkaság szerint, azon belül név. Amíg minden pet azonos
    // ritkaságú, ez gyakorlatilag ABC-sorrend – ha később kitöltöd a rarity
    // mezőt, a ritkábbak maguktól előre kerülnek.
    return filtered.sort((a, b) => {
      const byRarity = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
      if (byRarity !== 0) return byRarity;
      return a.name.localeCompare(b.name, 'hu');
    });
  }, [pets, filters, owned, searchIndex, group, groupById]);

  const breakdown = useMemo<BreakdownEntry[]>(() => {
    const totals = new Map<string, { owned: number; total: number }>();
    for (const pet of pets) {
      const id = groupById.get(pet.id) ?? 'egyeb';
      const entry = totals.get(id) ?? { owned: 0, total: 0 };
      entry.total += 1;
      if (owned.has(pet.id)) entry.owned += 1;
      totals.set(id, entry);
    }
    // A fülek sorrendjét követjük, hogy a sáv és a fülsor egyezzen.
    return GROUPS.filter((entry) => totals.has(entry.id)).map((entry) => ({
      label: entry.label,
      ...totals.get(entry.id)!,
    }));
  }, [pets, owned, groupById]);

  /** Csak az aktuális fülön belül számoljuk – különben a jelölőnégyzet
   *  olyan darabszámot ígérne, amiből a fülön egy sincs. */
  const incompleteCount = useMemo(
    () =>
      pets.filter(
        (pet) =>
          (group === 'all' || groupById.get(pet.id) === group) &&
          isIncomplete(pet),
      ).length,
    [pets, group, groupById],
  );

  /** Csak a valóban létező petek pipáit tartjuk meg – ha egy pet kikerül
   *  az adatokból, ne lógjon bent a régi id a mentésben. */
  const ownedIds = useMemo(
    () => pets.filter((pet) => owned.has(pet.id)).map((pet) => pet.id),
    [pets, owned],
  );

  const visibleIds = visiblePets.map((pet) => pet.id);
  const allVisibleOwned =
    visibleIds.length > 0 && visibleIds.every((id) => owned.has(id));
  const noVisibleOwned = visibleIds.every((id) => !owned.has(id));

  const handleImport = (ids: string[]) => {
    const validIds = new Set(pets.map((pet) => pet.id));
    replaceAll(ids.filter((id) => validIds.has(id)));
  };

  return (
    <div className={styles.tracker}>
      <div className={styles.topRow}>
        <ProgressPanel
          owned={ownedIds.length}
          total={pets.length}
          breakdown={breakdown}
          loaded={loaded}
        />
        <CollectionTools
          ownedIds={ownedIds}
          onImport={handleImport}
          onReset={reset}
        />
      </div>

      <nav className={styles.tabs} aria-label="Megszerzési hely">
        <button
          type="button"
          className={`${styles.tab} ${group === 'all' ? styles.tabActive : ''}`}
          aria-pressed={group === 'all'}
          onClick={() => setGroup('all')}
        >
          Összes <span className={styles.tabCount}>{pets.length}</span>
        </button>
        {GROUPS.filter((entry) => (groupCounts.get(entry.id) ?? 0) > 0).map(
          (entry) => (
            <button
              key={entry.id}
              type="button"
              className={`${styles.tab} ${
                group === entry.id ? styles.tabActive : ''
              }`}
              aria-pressed={group === entry.id}
              onClick={() => setGroup(entry.id)}
            >
              {entry.label}{' '}
              <span className={styles.tabCount}>{groupCounts.get(entry.id)}</span>
            </button>
          ),
        )}
      </nav>

      {group !== 'all' && (
        <p className={styles.tabHint}>
          {GROUPS.find((entry) => entry.id === group)?.hint}
        </p>
      )}

      <Filters
        filters={filters}
        onChange={setFilters}
        resultCount={visiblePets.length}
        totalCount={pets.length}
        incompleteCount={incompleteCount}
      />

      <div className={styles.bulkRow}>
        <span>A most látható {visiblePets.length} petre:</span>
        <button
          type="button"
          className={styles.bulkButton}
          disabled={!loaded || allVisibleOwned || visibleIds.length === 0}
          onClick={() => markMany(visibleIds, true)}
        >
          Mind pipálása
        </button>
        <button
          type="button"
          className={styles.bulkButton}
          disabled={!loaded || noVisibleOwned}
          onClick={() => markMany(visibleIds, false)}
        >
          Pipák levétele
        </button>

        <div className={styles.viewToggle} role="group" aria-label="Nézet">
          <button
            type="button"
            className={`${styles.bulkButton} ${
              view === 'cards' ? styles.viewActive : ''
            }`}
            aria-pressed={view === 'cards'}
            onClick={() => setView('cards')}
          >
            Kártyák
          </button>
          <button
            type="button"
            className={`${styles.bulkButton} ${
              view === 'list' ? styles.viewActive : ''
            }`}
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            Tömör lista
          </button>
        </div>
      </div>

      {visiblePets.length === 0 ? (
        <p className={styles.empty}>
          Nincs a szűrőknek megfelelő pet. Próbáld módosítani a keresést vagy a
          szűrőket.
        </p>
      ) : view === 'list' ? (
        <PetTable
          pets={visiblePets}
          owned={owned}
          onToggle={toggle}
          disabled={!loaded}
        />
      ) : (
        <ul className={styles.grid}>
          {visiblePets.map((pet) => (
            <li key={pet.id}>
              <PetCard
                pet={pet}
                owned={owned.has(pet.id)}
                onToggle={toggle}
                disabled={!loaded}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
