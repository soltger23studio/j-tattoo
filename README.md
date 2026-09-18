# Pet Gyűjtemény – Metin2 pet követő

Weboldal, ahol egy helyen, rendszerezve látszik minden pet: **honnan és hogyan
szerezhető meg**, és mindenki **kipipálhatja magának**, melyik van már meg.

## Mit tud

- **Pet-lista** kártyákban: név, ritkaság, kategória, megszerzési mód(ok),
  részletes leírás, hely, bónuszok, megjegyzések
- **Pipálás** petenként – a böngészőben tárolva, regisztráció nélkül
- **Szűrők**: „csak ami hiányzik" / „csak ami megvan", megszerzési mód,
  ritkaság, kategória szerint
- **Keresés** név, megszerzési mód vagy hely szerint (ékezet nélkül is működik:
  a „tuz" megtalálja a „Tűz Sárkány"-t)
- **Haladásjelző**: összesített és kategóriánkénti százalék
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

A teljes pet-lista legépelése helyett a `scripts/import-pets.mjs` kiszedi a
peteket a szerver wikijéről, letölti a képeket a `public/images/pets/` mappába,
és legenerálja a `lib/pets.ts`-t:

```bash
node scripts/import-pets.mjs "https://wiki.venor2.hu/items?type=ITEM_COSTUME&subtype=COSTUME_PET"
```

Ha a wiki nem érhető el arról a gépről, ahol a szkriptet futtatod, mentsd le az
oldalt és add meg fájlként:

```bash
node scripts/import-pets.mjs ./wiki.html     # lementett oldal
node scripts/import-pets.mjs ./pets.json     # a wiki JSON-válasza
```

A szkript többféle oldalszerkezetet ismer: táblázatos listát, kártyás listát,
JSON API-választ és a HTML-be ágyazott JSON-t is. Ha a lista JavaScripttel
töltődik be, a nyers HTML-ben nincs adat – ilyenkor a böngészőben nyisd meg az
oldalt, majd DevTools (F12) → Elements → jobb klikk a `<html>`-en → **Copy
outerHTML**, és azt mentsd el `wiki.html` néven.

Kapcsolók:

| kapcsoló | mit csinál |
|---|---|
| `--dry-run` | nem ír fájlt, csak kilistázza, mit talált |
| `--no-images` | kihagyja a képek letöltését |
| `--category "Pet kosztüm"` | kategória az importált peteknek |
| `--rarity common` | ritkaság az importált peteknek |
| `--pages 5` | hány lapot kérjen le (alapból addig megy, amíg új pet jön) |
| `--out lib/pets.ts` | kimeneti fájl |

Amit a szkript **nem** tud: a wikin nincs megszerzési infó, ezért minden
importált petnél üres marad a `sources`, és nincs `howToGet`. Az oldal az ilyen
peteket pirossal jelzi, és külön rá lehet szűrni – így szépen végig lehet menni
rajtuk, és kézzel kitölteni. Ugyanígy a `category` és a `rarity` is egységes
alapérték: ezeket utólag érdemes kézzel pontosítani.

Újbóli importnál a szkript a meglévő `lib/pets.ts`-ből **átveszi a már meglévő
`id`-ket** a pet neve alapján, hogy a látogatók pipái ne vesszenek el.

## Hogyan adj hozzá vagy módosíts peteket

Minden pet-adat **egyetlen fájlban** van: `lib/pets.ts`. A kódhoz nem kell
hozzányúlni, csak ebben a listában kell szerkeszteni.

Egy pet így néz ki:

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
| `shop` | Item Shop |
| `drop` | Drop (szörnyekből) |
| `boss` | Boss |
| `dungeon` | Dungeon |
| `quest` | Küldetés |
| `craft` | Készítés |
| `trade` | Csere / piac |
| `donate` | Támogatói |
| `other` | Egyéb |

Egy petnek **több** forrása is lehet, pl. `sources: ['event', 'trade']`.

> **Fontos:** az `id` mezőt utólag **ne írd át**. A látogatók pipái ez alapján
> vannak elmentve – egy átnevezett `id`-nél elveszik a jelölésük. Új pet
> felvételéhez adj hozzá új `id`-t; egy pet törlésekor a régi jelölés magától
> kiesik.

Ha új kategóriát vagy ritkaságot használsz, a szűrő legördülői **maguktól
frissülnek**, nem kell máshol módosítani.

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
lib/pets.ts     >>> ITT VAN A PET-LISTA <<< (generált, de kézzel is írható)
lib/types.ts    adatszerkezet, feliratok, forrás-színek
lib/groups.ts   a fülek: melyik pet melyik csoportba kerül
public/images/pets/  pet-képek
scripts/fetch-wiki-pets.mjs  adat leszedése a wiki API-jából -> wiki-pets.json
scripts/import-pets.mjs      abból lib/pets.ts + képek
```
