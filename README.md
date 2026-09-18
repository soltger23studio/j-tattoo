# Pet Gyűjtemény – Metin2 pet követő

Weboldal, ahol egy helyen, rendszerezve látszik minden pet: **honnan és hogyan
szerezhető meg**, és mindenki **kipipálhatja magának**, melyik van már meg.

## Mit tud

- **Pet-lista** kártyákban: név, kép, megszerzési mód(ok), a megszerzés
  lépései az árakkal, hely és bónuszok
- **Pipálás** petenként – a böngészőben tárolva, regisztráció nélkül
- **Fülek megszerzési hely szerint** (Vegyeskereskedő, Theowahdan, Alkimista,
  Biológus, Esemény, Kazamata, Egyéb). Minden pet pontosan egy fülre kerül,
  így a fülek számai kiadják a teljes listát – a besorolást a
  `lib/groups.ts` írja le
- **Színkód a forrás szerint**: boss piros, kazamata lila, esemény narancs,
  drop kék, NPC bolt türkiz, küldetés sárga, Item Shop rózsaszín
- **Szűrők**: „csak ami hiányzik" / „csak ami megvan", és a megszerzési infó
  nélküli petek
- **Keresés** név, NPC, esemény, kazamata, bónusz vagy ár-tétel szerint
  (ékezet nélkül is működik: a „tuz" megtalálja a „Tűz Sárkány"-t)
- **Haladásjelző**: összesített és fülenkénti százalék
- **Tömeges pipálás**: a szűrt találatok egyszerre bejelölhetők – így egy nagy
  gyűjtemény percek alatt felvihető
- **Két nézet**: részletes kártyák, vagy tömör lista (több száz petnél ez
  sokkal átláthatóbb)
- **Hiányos petek szűrése**: amelyiknél még nem tudjuk, honnan szerezhető meg,
  azt az oldal pirossal jelzi, és külön rá lehet szűrni – így látszik, mit kell
  még kideríteni
- **Export / import kód**: a gyűjtemény átvihető másik gépre vagy telefonra
- Mobilon is használható

## Futtatás a saját gépen

```bash
npm install
npm run dev
```

Ezután nyisd meg: http://localhost:3000

## Pet-lista importálása a wikiről

**Két lépés**, mert a wiki lista-oldala kliensoldali alkalmazás: a nyers
HTML-ben nincs egyetlen pet sem, az adat a wiki saját API-jából jön.

```bash
node scripts/fetch-wiki-pets.mjs              # -> wiki-pets.json
node scripts/import-pets.mjs ./wiki-pets.json # -> lib/pets.ts + képek
```

Az első lépés szedi le az API-ból a neveket, ikonokat, bónuszokat és a
megszerzési adatokat; a második ebből generálja a `lib/pets.ts`-t és tölti le
a képeket a `public/images/pets/` mappába.

A `scripts/import-pets.mjs` önmagában lementett HTML-t vagy JSON-t is elfogad
(`node scripts/import-pets.mjs ./wiki.html`), ha valaha más forrásból kellene
dolgozni.

Kapcsolók:

| kapcsoló | mit csinál |
|---|---|
| `--dry-run` | nem ír fájlt, csak kilistázza, mit talált |
| `--no-images` | kihagyja a képek letöltését |
| `--category "Pet kosztüm"` | kategória az importált peteknek |
| `--rarity common` | ritkaság az importált peteknek |
| `--pages 5` | hány lapot kérjen le (alapból addig megy, amíg új pet jön) |
| `--out lib/pets.ts` | kimeneti fájl |

A `fetch-wiki-pets.mjs` kapcsolói: `--out`, `--locale hu`, és a `--no-sources`
(kihagyja a megszerzési adatokat, így sokkal gyorsabb).

Amit a szkript **megszerez**: nevet, ikont, wiki-linket, bónuszokat, és a
megszerzési módot három forrásból (NPC-boltok, drop-táblák, event- és
kazamata-cikkek). Jelenleg 70 petből 64-hez van megszerzési infó.

Amit **nem**: a `rarity` és a `category` a wikiben nincs benne, ezért minden
petnél az importálás alapértéke áll. A maradék néhány petnél pedig egyszerűen
nincs adat – ezeket az oldal pirossal jelzi, és külön rá lehet szűrni.

Újbóli importnál a szkript a meglévő `lib/pets.ts`-ből **átveszi a már meglévő
`id`-ket** a pet neve alapján, hogy a látogatók pipái ne vesszenek el.

### Heti wiki-figyelő

A `.github/workflows/wiki-figyelo.yml` minden hétfőn lefuttatja ugyanezt a
két lépést a wiki ellen. Ha talál változást – új pet, átnevezés, módosult
bónusz vagy ár –, **nyit egy pull requestet** a frissített `lib/pets.ts`-szel
és képekkel, a leírásban felsorolva, mely petek kerültek be vagy tűntek el.
Ha nincs változás, nem csinál semmit.

Kézzel is indítható: repo **Actions** fül → *Wiki-figyelő* → **Run workflow**.

A `lib/pet-overrides.ts`-hez soha nem nyúl, tehát a kézi kiegészítések egy
ilyen frissítést is túlélnek.

> A PR nyitásához a repóban engedélyezve kell lennie a
> **Settings → Actions → General → Allow GitHub Actions to create and approve
> pull requests** kapcsolónak. Enélkül a futás a PR-lépésnél elhasal, a
> frissített ág viszont akkor is felkerül.

## Hogyan adj hozzá vagy módosíts peteket

Két fájl van, és **fontos, hogy melyikbe írsz**:

| Fájl | Mi ez | Szerkeszthető? |
|---|---|---|
| `lib/pets.ts` | a wikiről **generált** lista | egy újraimportálás felülírja |
| `lib/pet-overrides.ts` | a te **kézi** kiegészítéseid | a szkript soha nem bántja |

Ha olyasmit írsz be, amit a wiki is tud (vagy tudni fog), az mehet a
`lib/pets.ts`-be – de számolj vele, hogy a következő
`node scripts/import-pets.mjs` felülírja.

**Amit a wiki nem tud – pl. hogy egy pet Item Shopos, vagy melyik küldetés
adja –, azt a `lib/pet-overrides.ts`-be írd.** Ott a pet `id`-je alá csak
azokat a mezőket kell felsorolni, amiket felül akarsz írni:

```ts
'kiraly-pingvin': {
  sources: ['quest'],
  howToGet: 'A Jégmező küldetéssor jutalma.',
  location: 'Jégmező – Pingvin NPC',
},
```

A többi mező marad a generált értéken. Elgépelt `id`-re a fejlesztői
szerver figyelmeztet a konzolon.

Egy teljes pet a `lib/pets.ts`-ben így néz ki:

```ts
{
  id: 'tuz-sarkany',          // egyedi azonosító – lásd lentebb a figyelmeztetést
  name: 'Tűz Sárkány',        // a pet neve
  category: 'Harci pet',      // szabadon választható kategória
  rarity: 'legendary',        // common | rare | epic | legendary
  sources: ['boss', 'dungeon'],
  howToGet: 'A Tűz Templom végső bossának ritka dropja.',
  location: 'Tűz Templom',    // opcionális
  bonuses: ['+12% támadóerő'],// opcionális
  image: '/images/pets/tuz-sarkany.png', // opcionális
  wikiUrl: 'https://...',     // opcionális
  notes: 'Heti egyszer futható.', // opcionális
}
```

### Ha még nem tudod, honnan szerezhető meg

Hagyd üresen a `sources` tömböt, és hagyd ki a `howToGet` mezőt:

```ts
{
  id: 'szellemroka',
  name: 'Szellemróka',
  category: 'Dísz pet',
  rarity: 'rare',
  sources: [],
}
```

Az ilyen pet is megjelenik és pipálható, de az oldal jelzi, hogy hiányzik a
megszerzési infó, és a szűrőben egy pipával kilistázható az összes ilyen.
Ez akkor hasznos, ha a pet-listát a wikiről importáljuk (onnan a nevek és a
képek jönnek), a megszerzési módokat viszont utólag kell kitölteni.

A `sources` lehetséges értékei:

| érték | jelentése |
|---|---|
| `event` | Esemény |
| `shop` | NPC bolt |
| `drop` | Drop (szörnyekből, ládákból) |
| `boss` | Boss |
| `dungeon` | Kazamata |
| `quest` | Küldetés |
| `craft` | Készítés |
| `trade` | Csere / piac |
| `donate` | Item Shop |
| `other` | Egyéb |

Egy petnek **több** forrása is lehet, pl. `sources: ['event', 'trade']`.

> **Fontos:** az `id` mezőt utólag **ne írd át**. A látogatók pipái ez alapján
> vannak elmentve – egy átnevezett `id`-nél elveszik a jelölésük. Új pet
> felvételéhez adj hozzá új `id`-t; egy pet törlésekor a régi jelölés magától
> kiesik.

A ritkaság és a kategória csak akkor jelenik meg a kártyákon, ha van bennük
**többféle érték**. Ma minden pet `common` / „Pet kosztüm", ezért egyik sem
látszik; amint kitöltesz párat kézzel, maguktól visszatérnek – a kártyákra, a
tömör lista oszlopába és a rendezésbe is.

### Képek

Tedd a képfájlt a `public/images/pets/` mappába, majd hivatkozz rá:
`image: '/images/pets/fajlnev.png'`. Kép nélkül a pet nevének kezdőbetűje
jelenik meg helyette, tehát az oldal kép nélkül is használható.

Ha külső (pl. wiki) képeket akarsz linkelni, a `next.config.ts`-ben vedd ki a
kommentet az `images.remotePatterns` résznél, és írd be a wiki domainjét.

### A „Példaadatok" figyelmeztetés eltüntetése

A `lib/pets.ts` tetején állítsd `false`-ra:

```ts
export const IS_SAMPLE_DATA = false;
```

## Hogyan tárolódnak a pipák

A jelölések a látogató saját böngészőjében (`localStorage`) vannak, a
`metin2-pet-collection-v1` kulcs alatt. Nincs szerver, nincs regisztráció, és
semmilyen adat nem kerül ki a gépről.

Ennek a hátulütője, hogy a jelölés böngészőhöz kötött. Erre való a **„Kód
készítése" / „Kód betöltése"** gomb: a gyűjtemény egy szöveges kóddá alakítható,
ami másik gépen vagy telefonon betölthető.

## Kirakás Vercelre

1. Pushold a kódot GitHubra (ez a repo).
2. Menj a [vercel.com](https://vercel.com) oldalra, jelentkezz be GitHub-fiókkal.
3. **Add New → Project**, és válaszd ki ezt a repót.
4. A Vercel felismeri, hogy Next.js projekt – nem kell semmit átállítani,
   csak **Deploy**.
5. Ezután minden `git push` automatikusan új verziót tesz ki.

Saját domain a Vercel projekt **Settings → Domains** menüjében köthető rá.

## Technikai összefoglaló

- Next.js 15 (App Router) + TypeScript
- CSS Modules, saját CSS változókkal (`app/globals.css`)
- Nincs backend és nincs adatbázis – az adat statikus, a jelölés a böngészőben

```
app/            oldalak, layout, globális stílusok, favicon (icon.svg)
components/     komponensek, mindegyik saját mappában a CSS Module-jával
lib/pets.ts     a wikiről generált pet-lista (importáláskor felülíródik)
lib/pet-overrides.ts  >>> IDE ÍRD A KÉZI KIEGÉSZÍTÉSEKET <<<
lib/types.ts    adatszerkezet, feliratok, forrás-színek
lib/groups.ts   a fülek: melyik pet melyik csoportba kerül
public/images/pets/  pet-képek
scripts/fetch-wiki-pets.mjs  adat leszedése a wiki API-jából -> wiki-pets.json
scripts/import-pets.mjs      abból lib/pets.ts + képek
scripts/pet-nevek.mjs        pet-nevek listája (a wiki-figyelő használja)
.github/workflows/           heti wiki-figyelő
```
