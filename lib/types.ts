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
  /** Rövid, konkrét leírás: hogyan szerezhető meg.
   *  Üresen hagyható, amíg nincs meg az infó – az oldal jelzi a hiányt,
   *  és külön rá lehet szűrni a hiányos petekre. */
  howToGet?: string;
  /** Hol (NPC, kazamata, boss – a legbeszédesebb egy forrás). */
  location?: string;
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
  donate: 'Támogatói',
  other: 'Egyéb',
};

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
