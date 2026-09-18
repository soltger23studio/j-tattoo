import { PETS as GENERATED } from './pets';
import type { Pet } from './types';

/**
 * ============================================================
 *  KÉZI KIEGÉSZÍTÉSEK
 * ============================================================
 *
 * A lib/pets.ts GENERÁLT fájl: a scripts/import-pets.mjs minden futáskor
 * felülírja. Amit kézzel tudsz a petekről – és a wiki nem árulja el –, az
 * ide jön, mert ezt a fájl a szkript soha nem bántja.
 *
 * Kulcs = a pet `id`-je a lib/pets.ts-ből. A megadott mezők felülírják a
 * generáltat, a többi marad. Tipikusan ennyi kell:
 *
 *   'valami-pet': {
 *     sources: ['quest'],
 *     howToGet: 'A Sárkány Öröksége küldetés jutalma.',
 *     location: 'Bölcs NPC – Falu',
 *   },
 *
 * sources = 'event' | 'shop' | 'drop' | 'boss' | 'dungeon'
 *         | 'quest' | 'craft' | 'trade' | 'donate' | 'other'
 *
 * A 'donate' felirata "Item Shop", a 'shop'-é "NPC bolt".
 *
 * FONTOS: a `howToGet` felülírja a wikiből generált lépéseket, ezért folyó
 * szövegként jelenik meg, nem ár-pirulákra bontva.
 */
const OVERRIDES: Record<string, Partial<Pet>> = {
  // --- Item Shopból vásárolható petek -------------------------------------
  mambo: {
    sources: ['donate'],
    howToGet: 'Item Shopban vásárolható meg.',
    location: 'Item Shop',
  },
  zafira: {
    sources: ['donate'],
    howToGet: 'Item Shopban vásárolható meg.',
    location: 'Item Shop',
  },
  luka: {
    sources: ['donate'],
    howToGet: 'Item Shopban vásárolható meg.',
    location: 'Item Shop',
  },

  // --- Küldetésből szerezhető petek ---------------------------------------
  'kiraly-pingvin': {
    sources: ['quest'],
    howToGet: 'Küldetésből szerezhető meg.',
  },
  'vigyor-kandur': {
    sources: ['quest'],
    howToGet: 'Küldetésből szerezhető meg.',
  },

  // Luna (210236) még hiányzik – ha kiderül, honnan szerezhető, ide jöhet.
};

/** A generált lista, a kézi kiegészítésekkel együtt. Az oldal ezt használja. */
export const PETS: Pet[] = GENERATED.map((pet) => {
  const override = OVERRIDES[pet.id];
  return override ? { ...pet, ...override } : pet;
});

/** Ha egy id elgépelődik, csendben hatástalan lenne – inkább szóljunk. */
if (process.env.NODE_ENV !== 'production') {
  const ids = new Set(GENERATED.map((pet) => pet.id));
  for (const id of Object.keys(OVERRIDES)) {
    if (!ids.has(id)) {
      console.warn(
        `[pet-overrides] Nincs ilyen pet a lib/pets.ts-ben: "${id}" – ` +
          'elírás, vagy a pet kikerült a wikiből.',
      );
    }
  }
}
