/** Honnan lehet megszerezni egy petet. */
export type PetSource =
  | 'event'
  | 'shop'
  | 'drop'
  | 'boss'
  | 'dungeon'
  | 'quest'
  | 'craft'
  | 'trade'
  | 'donate'
  | 'other';

/** Egy megszerzési lépés: egy mondat, a hozzá tartozó forrás-típussal. */
export interface AcquisitionStep {
  /** Ettől kapja a lépés a színét. */
  kind: PetSource;
  /** Mondat záró pont NÉLKÜL, hogy a költség hozzáfűzhető legyen. */
  text: string;
  /** Bolti ár tételekre bontva, hogy külön pirulaként lehessen kirakni. */
  costs?: string[];
}

/** Ritkasági szintek – a kártyák színezését is ez adja. */
export type PetRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Pet {
  /** Egyedi, változatlan azonosító. FONTOS: ez alapján van elmentve,
   *  hogy kinek mi van meg – ha egy id-t átírsz, a pipa elveszik. */
  id: string;
  name: string;
  /** Kategória (pl. "Harci pet", "Dísz pet"). Szabadon bővíthető. */
  category: string;
  rarity: PetRarity;
  /** Egy petnek több megszerzési módja is lehet.
   *  Üres tömb = a wiki nem árulja el, honnan szerezhető. */
  sources: PetSource[];
  /** A wikiből generált megszerzési lépések. Ezt a szkript tölti ki. */
  acquisition?: AcquisitionStep[];
  /** Kézzel írt leírás. Ha ki van töltve, ez nyer az `acquisition` felett –
   *  ide jöhet az a néhány pet, amiről a wiki nem árul el semmit. */
  howToGet?: string;
  /** Hol (NPC, kazamata, boss – a legbeszédesebb egy forrás). */
  location?: string;
  /** Mely NPC-k árulják. A fülekre bontás ez alapján megy, ezért külön
   *  mezőben van, nem a howToGet mondatból visszafejtve. */
  npcs?: string[];
  /** Milyen bónuszokat ad, a wiki magyar feliratával
   *  (pl. "Szörnyek elleni erő +3%"). */
  bonuses?: string[];
  /** Kép a public/images/pets/ mappából, pl. "/images/pets/kutyus.png". */
  image?: string;
  /** Link a szerver wikijére vagy fórumára. */
  wikiUrl?: string;
  /** Bármilyen egyéb megjegyzés (pl. "csak karácsonykor elérhető"). */
  notes?: string;
}

export const SOURCE_LABELS: Record<PetSource, string> = {
  event: 'Esemény',
  shop: 'NPC bolt',
  drop: 'Drop',
  boss: 'Boss',
  dungeon: 'Kazamata',
  quest: 'Küldetés',
  craft: 'Készítés',
  trade: 'Csere / piac',
  donate: 'Item Shop',
  other: 'Egyéb',
};

/**
 * Melyik forrás adja a pet színét, ha többől is megszerezhető. 40 petnek van
 * egynél több forrása, ezért kell sorrend: a ritkább, "elmenni érte" jellegű
 * források előre, a bolti a végére – így a rácsban a bossok és a kazamaták
 * kiugranak, nem vesznek el a sok bolti pet között.
 */
export const SOURCE_PRIORITY: PetSource[] = [
  'boss',
  'dungeon',
  'event',
  'drop',
  'quest',
  'donate',
  'shop',
  'craft',
  'trade',
  'other',
];

/** A pet színét adó forrás, vagy null, ha egyáltalán nincs megszerzési adat. */
export function primarySource(pet: { sources: PetSource[] }): PetSource | null {
  return (
    SOURCE_PRIORITY.find((source) => pet.sources.includes(source)) ??
    pet.sources[0] ??
    null
  );
}

/** A forráshoz tartozó CSS-változó, saját szín híján a tompa alapértelmezés. */
export function sourceColor(source: PetSource | null): string {
  return source
    ? `var(--source-${source}, var(--source-unknown))`
    : 'var(--source-unknown)';
}

export const RARITY_LABELS: Record<PetRarity, string> = {
  common: 'Gyakori',
  rare: 'Ritka',
  epic: 'Epikus',
  legendary: 'Legendás',
};

export const RARITY_ORDER: Record<PetRarity, number> = {
  legendary: 0,
  epic: 1,
  rare: 2,
  common: 3,
};

/** Egy pet akkor "hiányos", ha még nem tudjuk, honnan szerezhető meg. */
export function isIncomplete(pet: { sources: PetSource[] }): boolean {
  return pet.sources.length === 0;
}

/**
 * A megszerzés egyetlen folyó szövegként – a táblázat és a kereső ezt
 * használja, ahol a pirulás bontásnak nincs helye. A kézzel írt `howToGet`
 * mindig előbbre való a generált lépéseknél.
 */
export function acquisitionText(pet: Pet): string {
  if (pet.howToGet?.trim()) return pet.howToGet.trim();
  return (pet.acquisition ?? [])
    .map((step) =>
      step.costs && step.costs.length > 0
        ? `${step.text}: ${step.costs.join(' + ')}.`
        : `${step.text}.`,
    )
    .join(' ');
}
