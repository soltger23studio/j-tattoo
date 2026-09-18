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
import type { Pet, PetRarity, PetSource } from '@/lib/types';
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

  /** A szűrő legördülőit magából az adatból építjük, hogy új kategória
   *  vagy forrás hozzáadásakor ne kelljen itt is módosítani. */
  const { categories, sources, rarities, searchIndex } = useMemo(() => {
    const categorySet = new Set<string>();
    const sourceSet = new Set<PetSource>();
    const raritySet = new Set<PetRarity>();
    const index = new Map<string, string>();

    for (const pet of pets) {
      categorySet.add(pet.category);
      pet.sources.forEach((source) => sourceSet.add(source));
      raritySet.add(pet.rarity);
      index.set(pet.id, searchableText(pet));
    }

    return {
      categories: [...categorySet].sort((a, b) => a.localeCompare(b, 'hu')),
      sources: [...sourceSet].sort(),
      rarities: [...raritySet].sort(
        (a, b) => RARITY_ORDER[a] - RARITY_ORDER[b],
      ),
      searchIndex: index,
    };
  }, [pets]);

  const visiblePets = useMemo(() => {
    const query = normalize(filters.search.trim());

    const filtered = pets.filter((pet) => {
      if (query && !(searchIndex.get(pet.id) ?? '').includes(query)) {
        return false;
      }
      if (filters.status === 'owned' && !owned.has(pet.id)) return false;
      if (filters.status === 'missing' && owned.has(pet.id)) return false;
      if (filters.source !== 'all' && !pet.sources.includes(filters.source)) {
        return false;
      }
      if (filters.rarity !== 'all' && pet.rarity !== filters.rarity) {
        return false;
      }
      if (filters.category !== 'all' && pet.category !== filters.category) {
        return false;
      }
      if (filters.onlyIncomplete && !isIncomplete(pet)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (filters.sort === 'name') {
        return a.name.localeCompare(b.name, 'hu');
      }
      if (filters.sort === 'category') {
        const byCategory = a.category.localeCompare(b.category, 'hu');
        if (byCategory !== 0) return byCategory;
      }
      const byRarity = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
      if (byRarity !== 0) return byRarity;
      return a.name.localeCompare(b.name, 'hu');
    });
  }, [pets, filters, owned, searchIndex]);

  const breakdown = useMemo<BreakdownEntry[]>(() => {
    const totals = new Map<string, { owned: number; total: number }>();
    for (const pet of pets) {
      const entry = totals.get(pet.category) ?? { owned: 0, total: 0 };
      entry.total += 1;
      if (owned.has(pet.id)) entry.owned += 1;
      totals.set(pet.category, entry);
    }
    return [...totals.entries()]
      .map(([label, value]) => ({ label, ...value }))
      .sort((a, b) => a.label.localeCompare(b.label, 'hu'));
  }, [pets, owned]);

  const incompleteCount = useMemo(
    () => pets.filter(isIncomplete).length,
    [pets],
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

      <Filters
        filters={filters}
        onChange={setFilters}
        categories={categories}
        sources={sources}
        rarities={rarities}
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
