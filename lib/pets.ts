import type { Pet } from './types';

/**
 * ============================================================
 *  ITT KELL SZERKESZTENI A PET-LISTÁT
 * ============================================================
 *
 * Minden pet egy objektum a lenti listában. Új pet hozzáadása:
 * másold le az egyik blokkot, és írd át az adatokat.
 *
 * Kötelező mezők:  id, name, category, rarity, sources, howToGet
 * Opcionális:      location, bonuses, image, wikiUrl, notes
 *
 * rarity  = 'common' | 'rare' | 'epic' | 'legendary'
 * sources = 'event' | 'shop' | 'drop' | 'boss' | 'dungeon'
 *         | 'quest' | 'craft' | 'trade' | 'donate' | 'other'
 *
 * FONTOS: az `id` mezőt utólag NE írd át! A látogatók pipái ez
 * alapján vannak elmentve, egy átnevezett id-nél elveszik a jelölés.
 *
 * Kép hozzáadása: tedd a fájlt a public/images/pets/ mappába, majd
 * írd be: image: '/images/pets/fajlnev.png'
 */

/** Amíg true, az oldal tetején figyelmeztet, hogy ezek példaadatok.
 *  Ha kitöltötted az igazi petekkel, állítsd false-ra. */
export const IS_SAMPLE_DATA = true;

export const PETS: Pet[] = [
  {
    id: 'kutyus',
    name: 'Kutyus',
    category: 'Kezdő pet',
    rarity: 'common',
    sources: ['shop', 'quest'],
    howToGet:
      'A kezdő küldetéssorozat jutalma 15-ös szint körül, illetve bármikor megvehető az Item Shopban.',
    location: 'Falu – Pet kereskedő NPC',
    bonuses: ['+5% tapasztalat'],
    notes: 'A legtöbb karakternek ez az első petje.',
  },
  {
    id: 'fekete-kutyus',
    name: 'Fekete Kutyus',
    category: 'Kezdő pet',
    rarity: 'common',
    sources: ['drop'],
    howToGet: 'Alacsony eséllyel esik a Farkasoktól és a Vadkanoktól.',
    location: 'Vörös Erdő',
    bonuses: ['+5% tapasztalat', '+2% mozgási sebesség'],
  },
  {
    id: 'tigriskolyok',
    name: 'Tigriskölyök',
    category: 'Harci pet',
    rarity: 'rare',
    sources: ['dungeon'],
    howToGet:
      'A Démonvadász Torony 5. szintjének befejezéséért járó ládából szerezhető meg.',
    location: 'Démonvadász Torony',
    bonuses: ['+3% támadóerő', '+10% tapasztalat'],
    notes: 'Naponta egyszer futható a dungeon.',
  },
  {
    id: 'pandakolyok',
    name: 'Pandakölyök',
    category: 'Dísz pet',
    rarity: 'rare',
    sources: ['event'],
    howToGet:
      'A Holdfesztivál eseményen gyűjthető Holdsüteményekért cserélhető be az esemény NPC-jénél.',
    location: 'Esemény NPC – Falu központ',
    bonuses: ['+7% tapasztalat'],
    notes: 'Évente egyszer, ősszel érhető el.',
  },
  {
    id: 'nyuszi',
    name: 'Húsvéti Nyuszi',
    category: 'Dísz pet',
    rarity: 'rare',
    sources: ['event'],
    howToGet: 'Húsvéti eseményen 100 db Festett Tojás összegyűjtéséért jár.',
    location: 'Húsvéti esemény NPC',
    bonuses: ['+5% tapasztalat', '+3% itemdrop'],
    notes: 'Csak a húsvéti esemény ideje alatt szerezhető meg.',
  },
  {
    id: 'hoember',
    name: 'Hóember',
    category: 'Dísz pet',
    rarity: 'rare',
    sources: ['event', 'trade'],
    howToGet:
      'Téli eseményen a Hógolyó ládákból esik. Eseményen kívül csak játékosoktól vásárolható meg.',
    location: 'Téli esemény – minden térkép',
    bonuses: ['+5% védelem'],
  },
  {
    id: 'mikulas-manoja',
    name: 'Mikulás Manója',
    category: 'Dísz pet',
    rarity: 'epic',
    sources: ['event'],
    howToGet:
      'Karácsonyi eseményen az Ajándékdobozokból nyerhető, kb. 1% eséllyel.',
    location: 'Karácsonyi esemény',
    bonuses: ['+10% tapasztalat', '+5% yang drop'],
    notes: 'December közepétől január elejéig.',
  },
  {
    id: 'kis-demon',
    name: 'Kis Démon',
    category: 'Harci pet',
    rarity: 'epic',
    sources: ['boss'],
    howToGet:
      'A Démonkirály megöléséért esik ritkán. A boss 6 óránként újraéled.',
    location: 'Démon Torony – 8. emelet',
    bonuses: ['+5% támadóerő', '+5% átütő ütés'],
    notes: 'Csapattal ajánlott, 100+ szinttől.',
  },
  {
    id: 'kameleon',
    name: 'Kaméleon',
    category: 'Harci pet',
    rarity: 'epic',
    sources: ['craft'],
    howToGet:
      '10 db Kaméleonbőrből és 1 db Pet Tojásból készíthető el az Alkimista NPC-nél.',
    location: 'Alkimista NPC – Falu',
    bonuses: ['+7% támadóerő szörnyek ellen'],
  },
  {
    id: 'arany-malac',
    name: 'Aranymalac',
    category: 'Shop pet',
    rarity: 'epic',
    sources: ['shop', 'donate'],
    howToGet: 'Item Shopban vásárolható meg, 3000 Coinért.',
    location: 'Item Shop – Petek fül',
    bonuses: ['+10% yang drop', '+5% itemdrop'],
  },
  {
    id: 'bebi-sarkany',
    name: 'Bébi Sárkány',
    category: 'Harci pet',
    rarity: 'legendary',
    sources: ['quest', 'craft'],
    howToGet:
      'A "Sárkány Öröksége" küldetéssorozat befejezése után 5 db Sárkánykőből kelthető ki.',
    location: 'Sárkány Szentély',
    bonuses: ['+10% támadóerő', '+10% tapasztalat', '+5% minden ellenállás'],
    notes: 'A küldetéssorozat 105-ös szinttől indítható.',
  },
  {
    id: 'tuz-sarkany',
    name: 'Tűz Sárkány',
    category: 'Harci pet',
    rarity: 'legendary',
    sources: ['boss', 'dungeon'],
    howToGet:
      'A Tűz Templom végső bossának ritka dropja. Heti egyszer futható.',
    location: 'Tűz Templom',
    bonuses: ['+12% támadóerő', '+8% tűz ellenállás'],
    notes: 'A szerver egyik legritkább petje.',
  },
  {
    id: 'jeg-sarkany',
    name: 'Jég Sárkány',
    category: 'Harci pet',
    rarity: 'legendary',
    sources: ['boss'],
    howToGet: 'A Jégkirálynő megöléséért esik, nagyon alacsony eséllyel.',
    location: 'Jégföldek – Fagyott Barlang',
    bonuses: ['+12% támadóerő', '+8% jég ellenállás'],
  },
  {
    id: 'holdnyul',
    name: 'Holdnyúl',
    category: 'Dísz pet',
    rarity: 'common',
    sources: ['drop'],
    howToGet: 'Nyulaktól esik a kezdő térképeken.',
    location: 'Kezdő térképek',
    bonuses: ['+3% mozgási sebesség'],
  },
  {
    id: 'papagaj',
    name: 'Papagáj',
    category: 'Dísz pet',
    rarity: 'common',
    sources: ['shop'],
    howToGet: 'Item Shopban megvásárolható, 500 Coinért.',
    location: 'Item Shop – Petek fül',
    bonuses: ['+3% tapasztalat'],
  },
  {
    id: 'fekete-macska',
    name: 'Fekete Macska',
    category: 'Dísz pet',
    rarity: 'rare',
    sources: ['event'],
    howToGet: 'Halloween eseményen a Tökökből nyerhető.',
    location: 'Halloween esemény – minden térkép',
    bonuses: ['+5% itemdrop'],
    notes: 'Októberben érhető el.',
  },
  {
    id: 'bagoly',
    name: 'Bölcs Bagoly',
    category: 'Támogató pet',
    rarity: 'rare',
    sources: ['quest'],
    howToGet:
      'A "Tudás Ösvénye" küldetés jutalma, 60-as szinttől vehető fel.',
    location: 'Bölcs NPC – Falu',
    bonuses: ['+10% tapasztalat'],
  },
  {
    id: 'teknos',
    name: 'Ősi Teknős',
    category: 'Támogató pet',
    rarity: 'epic',
    sources: ['dungeon', 'craft'],
    howToGet:
      'A Vízi Barlangban szerezhető 30 db Teknőspáncélból készíthető el.',
    location: 'Vízi Barlang',
    bonuses: ['+8% védelem', '+5% max ÉP'],
  },
  {
    id: 'fenix',
    name: 'Főnix',
    category: 'Harci pet',
    rarity: 'legendary',
    sources: ['event', 'craft'],
    howToGet:
      'Az évfordulós eseményen gyűjthető 5 db Főnixtollból kelthető ki.',
    location: 'Évfordulós esemény',
    bonuses: ['+10% támadóerő', '+10% tapasztalat', 'Újraéledés bónusz'],
    notes: 'Évente egyszer, a szerver születésnapján.',
  },
  {
    id: 'arnyfarkas',
    name: 'Árnyfarkas',
    category: 'Harci pet',
    rarity: 'epic',
    sources: ['boss', 'trade'],
    howToGet: 'Az Árnyék Alfa bossból esik. Cserélhető, így piacon is kapható.',
    location: 'Sötét Erdő',
    bonuses: ['+6% támadóerő', '+5% kritikus ütés'],
  },
];
