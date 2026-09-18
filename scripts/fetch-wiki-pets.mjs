#!/usr/bin/env node
/**
 * ============================================================
 *  PET-ADATOK LESZEDÉSE A WIKI API-JÁBÓL
 * ============================================================
 *
 * Miért kell ez a lépés? A wiki lista-oldala kliensoldali alkalmazás:
 * a nyers HTML-ben nincs egyetlen pet sem, csak egy üres <div>. Az adat a
 * wiki saját API-jából jön, ezért azt kérdezzük le közvetlenül.
 *
 * Ez a szkript CSAK letölt és normalizál – nem ír a lib/pets.ts-be. A
 * kimenetét a scripts/import-pets.mjs dolgozza fel:
 *
 *   node scripts/fetch-wiki-pets.mjs                 # -> wiki-pets.json
 *   node scripts/import-pets.mjs ./wiki-pets.json    # -> lib/pets.ts + képek
 *
 * Kapcsolók:
 *   --out wiki-pets.json   hova írja a JSON-t
 *   --locale hu            melyik nyelven kérje a neveket (alap: hu)
 *   --no-sources           kihagyja a megszerzési adatokat (sokkal gyorsabb)
 *
 * ------------------------------------------------------------
 *  Honnan jön melyik adat
 * ------------------------------------------------------------
 *
 *   nevek + bónuszok    /api/items          type=ITEM_COSTUME, sub_type=COSTUME_PET
 *   ikonok              /api/icon-manifest  vnum -> fájlnév
 *   bónusz-feliratok    a wiki JS bundle-je (ld. loadApplyLabels)
 *
 *   megszerzés – három független forrásból, mert egyik sem fedi le mindet:
 *     bolt       /api/shops              minden NPC-bolt kínálata egyben
 *     drop       /api/drops/sources/...  petenként: melyik mobból/ládából esik
 *     event/kaz. /api/events, /api/dungeons  a cikkek [[item:VNUM]] hivatkozásai
 *
 * A bónuszok a játék nyers `apply_type0..3` / `apply_value0..3` mezőiben
 * vannak, pl. APPLY_ATTBONUS_MONSTER = 1. Az olvasható magyar felirat
 * ("Szörnyek elleni erő +%d%%") a wiki JS-ében él, ezért onnan szedjük ki.
 * Ha a wiki újraépül és ez nem sikerül, a szkript figyelmeztet és a nyers
 * nevet írja ki – ilyenkor a lib/pets.ts marad a régi, amíg nem futtatod újra.
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIKI = 'https://wiki.venor2.hu';

/** A wiki nginxe 404-et ad a nem böngésző user-agenteknek. */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Egyszerre ennyi kérés fut a petenkénti drop-lekérdezéseknél. */
const CONCURRENCY = 3;

function fail(message) {
  console.error(`\nHIBA: ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------- argumentumok

function parseArgs(argv) {
  const opts = { out: path.join(ROOT, 'wiki-pets.json'), locale: 'hu', sources: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') opts.out = path.resolve(process.cwd(), argv[++i]);
    else if (arg === '--locale') opts.locale = argv[++i];
    else if (arg === '--no-sources') opts.sources = false;
    else fail(`Ismeretlen kapcsoló: ${arg}`);
  }
  return opts;
}

// ---------------------------------------------------------------- letöltés

/**
 * A wiki kapcsolata megbízhatatlan (időnként connection reset), ezért
 * minden kérést újrapróbálunk növekvő várakozással. A 404 nem hiba: több
 * végpont ezzel jelzi, hogy az adott itemhez nincs adat.
 */
async function fetchWithRetry(url, { attempts = 8, asJson = false, on404 = null } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
      if (res.status === 404 && on404 !== null) return on404;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return asJson ? await res.json() : await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** (attempt - 1)));
      }
    }
  }
  throw new Error(`${url} -> ${lastError.message}`);
}

const getJson = (url, on404) => fetchWithRetry(url, { asJson: true, on404 });

/** Feladatok futtatása korlátozott párhuzamossággal. */
async function mapLimited(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------- bónusz-feliratok

/**
 * A wiki JS bundle-jéből kiszedi az `APPLY_* -> magyar felirat` táblát és a
 * hozzá tartozó alias-térképet. A bundle neve hash-elt (index-xxxx.js), ezért
 * előbb a kezdőoldalból olvassuk ki a hivatkozást.
 */
async function loadApplyLabels() {
  const index = await fetchWithRetry(`${WIKI}/`);
  const src = index.match(/<script[^>]*src="(\/index-[^"]+\.js)"/i)?.[1];
  if (!src) throw new Error('nem találom a JS bundle hivatkozását a kezdőoldalon');

  const bundle = await fetchWithRetry(`${WIKI}${src}`);

  const labels = new Map();
  const pattern = /(APPLY_[A-Z0-9_]+)\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = pattern.exec(bundle)) !== null) {
    labels.set(match[1], match[2]);
  }
  if (labels.size === 0) throw new Error('a bundle-ben nincs APPLY_ felirat-tábla');

  // A wiki néhány apply-t másik kulcs alatt tart nyilván (pl. DOUBLE_DROP).
  const aliases = new Map();
  const aliasBlock = bundle.match(/\{DOUBLE_DROP:"[^}]*\}/)?.[0];
  if (aliasBlock) {
    const aliasPattern = /([A-Z0-9_]+)\s*:\s*"([A-Z0-9_]+)"/g;
    let alias;
    while ((alias = aliasPattern.exec(aliasBlock)) !== null) {
      aliases.set(alias[1], alias[2]);
    }
  }

  console.log(`  ${labels.size} bónusz-felirat, ${aliases.size} alias`);
  return { labels, aliases };
}

/**
 * Ugyanaz a feloldási sorrend, amit a wiki használ: a közvetlen kulcs nyer,
 * utána a BLEND_ változat, végül az alias. Az első nem üres felirat győz.
 */
function resolveLabel(applyType, { labels, aliases }) {
  const bare = applyType.replace(/^APPLY_/, '');
  const candidates = [applyType, bare, `APPLY_${bare}`, `APPLY_BLEND_${bare}`, `BLEND_${bare}`];

  const alias = aliases.get(bare);
  if (alias) candidates.push(alias, `APPLY_${alias}`);

  for (const candidate of candidates) {
    const label = labels.get(candidate);
    if (label && label.trim()) return label;
  }
  return null;
}

/** "Szörnyek elleni erő +%d%%" + 3  ->  "Szörnyek elleni erő +3%" */
function formatBonus(template, value) {
  return template
    .replace(/%d/g, String(value))
    .replace(/%%/g, '%')
    .replace(/\+\s+/g, '+')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Egy item nyers apply_* mezőiből olvasható bónusz-lista. */
function readBonuses(item, labelTable, unknown) {
  const bonuses = [];
  for (let slot = 0; slot < 4; slot += 1) {
    const type = item[`apply_type${slot}`];
    const value = item[`apply_value${slot}`];
    if (!type || type === 'APPLY_NONE') continue;

    const template = resolveLabel(type, labelTable);
    if (template) {
      bonuses.push(formatBonus(template, value));
    } else {
      unknown.add(type);
      bonuses.push(`${type.replace(/^APPLY_/, '')} +${value}`);
    }
  }
  return bonuses;
}

// ---------------------------------------------------------------- megszerzés

const NUMBER_FORMAT = new Intl.NumberFormat('hu-HU');

/**
 * Egy bolti ajánlat ára tételekre bontva, hogy az oldal külön pirulaként
 * tudja kirakni. A yang-árat (price_type 1) csak akkor írjuk ki, ha nincs
 * mellette tárgy-fizetőeszköz – a boltok jellemzően mindkettőt kérik, és a
 * tárgy a lényegi információ.
 */
function readPrices(offer, itemNames) {
  const prices = offer.prices ?? [];
  const items = prices
    .filter((price) => price.price_type === 3 && price.price_vnum)
    .map((price) => {
      const name = itemNames.get(price.price_vnum) ?? `#${price.price_vnum}`;
      return `${NUMBER_FORMAT.format(price.amount)} db ${name}`;
    });
  if (items.length > 0) return items;

  const gold = prices.find((price) => price.price_type === 1 && price.amount > 0);
  return gold ? [`${NUMBER_FORMAT.format(gold.amount)} yang`] : [];
}

/** vnum -> [{ npc, tab, price }] az összes NPC-bolt kínálatából. */
function indexShops(shops, petVnums, itemNames) {
  const index = new Map();
  for (const shop of shops) {
    for (const offer of shop.offers ?? []) {
      const vnum = offer.item_vnum;
      if (!petVnums.has(vnum)) continue;
      const entry = {
        npc: shop.npc_name,
        tab: shop.name,
        costs: readPrices(offer, itemNames),
      };
      const list = index.get(vnum) ?? [];
      const same = (a, b) => a.join('|') === b.join('|');
      // Ugyanaz az NPC több fülön is árulhatja – egyszer elég.
      if (!list.some((other) => other.npc === entry.npc && same(other.costs, entry.costs))) {
        list.push(entry);
      }
      index.set(vnum, list);
    }
  }
  return index;
}

/** vnum -> [{ kind: 'event'|'dungeon', title }] a cikkek hivatkozásaiból. */
async function indexArticles(petVnums, locale) {
  const index = new Map();
  for (const kind of ['events', 'dungeons']) {
    const list = await getJson(`${WIKI}/api/${kind}?locale=${locale}`);
    for (const entry of list) {
      const article = await getJson(
        `${WIKI}/api/${kind}/${encodeURIComponent(entry.slug)}?locale=${locale}`,
        null,
      );
      const body = article?.body ?? '';
      const seen = new Set();
      for (const match of body.matchAll(/\[\[item:(\d+)/g)) {
        const vnum = Number(match[1]);
        if (!petVnums.has(vnum) || seen.has(vnum)) continue;
        seen.add(vnum);
        const list2 = index.get(vnum) ?? [];
        list2.push({ kind: kind === 'events' ? 'event' : 'dungeon', title: entry.title });
        index.set(vnum, list2);
      }
    }
  }
  return index;
}

/**
 * A ládák a drop-táblában belső néven szerepelnek, egybeírva és ékezet
 * nélkül: "AsmodeusLada", "NagyHFLada", "RothadtFadoboz". Szavakra bontjuk,
 * hogy olvasható legyen. Az ékezetek nem nyerhetők vissza (a "VillamLada"
 * ettől "Villam láda" marad, nem "Villám láda").
 */
function prettifyChest(raw) {
  return String(raw)
    // "HFLada" -> "HF Lada": mozaikszó után induló új szó
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b(Lada|Doboz|Fadoboz|Zsak)\b/g, (word) => word.toLowerCase())
    .replace(/\blada\b/g, 'láda')
    .replace(/\bfadoboz\b/g, 'fadoboz')
    .replace(/\bzsak\b/g, 'zsák')
    .replace(/\s+/g, ' ')
    .trim();
}

/** vnum -> [{ kind: 'boss'|'chest', name }] a drop-forrásokból. */
async function indexDrops(pets, locale, mobRanks) {
  const index = new Map();
  let done = 0;
  await mapLimited(pets, CONCURRENCY, async (pet) => {
    const rows = await getJson(
      `${WIKI}/api/drops/sources/item/${pet.vnum}?locale=${locale}`,
      [],
    );
    done += 1;
    if (done % 20 === 0) console.log(`  ${done}/${pets.length}`);
    if (!Array.isArray(rows) || rows.length === 0) return;

    const entries = [];
    for (const row of rows) {
      const name = row.source_name;
      if (!name) continue;
      if (row.source_type === 'mob') {
        const rank = mobRanks.get(name);
        entries.push({ kind: rank === 'BOSS' || rank === 'KING' ? 'boss' : 'mob', name });
      } else {
        entries.push({ kind: 'chest', name: prettifyChest(name) });
      }
    }
    if (entries.length > 0) index.set(pet.vnum, entries);
  });
  return index;
}

/**
 * A három forrásból összerakja a megszerzési lépéseket. Minden lépés egy
 * mondat (záró pont nélkül) és a hozzá tartozó forrás-típus; a bolti
 * lépéshez az ár tételekre bontva is megvan, hogy az oldal pirulaként
 * tudja kirakni. A `kind` a lib/types.ts PetSource értékeit használja.
 */
function buildAcquisition({ shop, drops, articles }) {
  const steps = [];
  let location = null;

  for (const entry of drops ?? []) {
    if (entry.kind === 'boss') {
      steps.push({ kind: 'boss', text: `Esik a(z) ${entry.name} nevű bossból` });
      location ??= entry.name;
    } else if (entry.kind === 'mob') {
      steps.push({ kind: 'drop', text: `Esik a(z) ${entry.name} nevű szörnyből` });
      location ??= entry.name;
    } else {
      steps.push({ kind: 'drop', text: `Kinyerhető ebből a ládából: ${entry.name}` });
    }
  }

  for (const entry of articles ?? []) {
    steps.push({
      kind: entry.kind,
      text:
        entry.kind === 'event'
          ? `Elérhető ez alatt: ${entry.title}`
          : `Megszerezhető innen: ${entry.title}`,
    });
    if (entry.kind === 'dungeon') location ??= entry.title;
  }

  for (const entry of shop ?? []) {
    steps.push({
      kind: 'shop',
      text: `Megvásárolható ${entry.npc} NPC-nél`,
      costs: entry.costs,
    });
    location ??= entry.npc;
  }

  return {
    sources: [...new Set(steps.map((step) => step.kind))],
    acquisition: steps,
    location,
    // Az oldal ez alapján csoportosít fülekre, ezért külön mezőben is
    // megtartjuk, ne a lépés-szövegből kelljen visszafejteni.
    npcs: (shop ?? []).map((entry) => entry.npc),
  };
}

// ---------------------------------------------------------------- futtatás

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log('Bónusz-feliratok a wiki JS-éből...');
  const labelTable = await loadApplyLabels();

  console.log('Itemek letöltése...');
  const items = await getJson(`${WIKI}/api/items?locale=${opts.locale}`);

  console.log('Ikon-lista letöltése...');
  const manifest = await getJson(`${WIKI}/api/icon-manifest`);
  const icons = manifest.items ?? {};

  const pets = items
    .filter((item) => item.type === 'ITEM_COSTUME' && item.sub_type === 'COSTUME_PET')
    .sort((a, b) => a.vnum - b.vnum);

  if (pets.length === 0) fail('egyetlen pet kosztümöt sem találtam az API válaszában');

  const petVnums = new Set(pets.map((item) => item.vnum));
  const itemNames = new Map(
    items.map((item) => [item.vnum, (item.locale_name || item.name || '').trim()]),
  );

  let shopIndex = new Map();
  let articleIndex = new Map();
  let dropIndex = new Map();

  if (opts.sources) {
    console.log('NPC-boltok letöltése...');
    const shops = await getJson(`${WIKI}/api/shops?locale=${opts.locale}`);
    shopIndex = indexShops(shops, petVnums, itemNames);

    console.log('Event- és kazamata-cikkek átnézése...');
    articleIndex = await indexArticles(petVnums, opts.locale);

    console.log('Szörnyek letöltése (boss-besoroláshoz)...');
    const mobs = await getJson(`${WIKI}/api/mobs?locale=${opts.locale}`);
    const mobRanks = new Map();
    for (const mob of mobs) {
      for (const key of ['locale_name', 'name']) {
        if (mob[key]) mobRanks.set(mob[key], mob.rank);
      }
    }

    console.log(`Drop-források lekérdezése (${pets.length} pet)...`);
    dropIndex = await indexDrops(pets, opts.locale, mobRanks);
  }

  const unknown = new Set();
  let withoutIcon = 0;

  const rows = pets.map((item) => {
    const icon = icons[String(item.vnum)];
    if (!icon) withoutIcon += 1;

    const acquisition = buildAcquisition({
      shop: shopIndex.get(item.vnum),
      drops: dropIndex.get(item.vnum),
      articles: articleIndex.get(item.vnum),
    });

    return {
      name: (item.locale_name || item.name || '').trim(),
      vnum: item.vnum,
      image: icon ? `${WIKI}/assets/icons/${icon}` : null,
      wikiUrl: `${WIKI}/items/${item.vnum}`,
      bonuses: readBonuses(item, labelTable, unknown),
      ...acquisition,
    };
  });

  const withoutBonus = rows.filter((row) => row.bonuses.length === 0).length;
  const withoutSource = rows.filter((row) => row.sources.length === 0).length;

  await writeFile(opts.out, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

  console.log(`\n${rows.length} pet -> ${path.relative(ROOT, opts.out)}`);
  if (withoutIcon > 0) console.log(`  ${withoutIcon} petnek nincs ikonja`);
  if (withoutBonus > 0) console.log(`  ${withoutBonus} petnek nincs bónusza`);
  if (opts.sources) {
    console.log(`  ${rows.length - withoutSource} petnek van megszerzési infója`);
    if (withoutSource > 0) {
      console.log(`  ${withoutSource} petnél a wiki nem árulja el, honnan szerezhető:`);
      rows
        .filter((row) => row.sources.length === 0)
        .forEach((row) => console.log(`    - ${row.name}`));
    }
  }
  if (unknown.size > 0) {
    console.warn(
      `\nFigyelem: ${unknown.size} bónusz-típushoz nem találtam feliratot, ` +
        'ezeknél a nyers név kerül a listába:\n  ' +
        [...unknown].join('\n  '),
    );
  }
  console.log(`\nKövetkező lépés:\n  node scripts/import-pets.mjs ${path.relative(ROOT, opts.out)}`);
}

main().catch((err) => fail(err.stack ?? err.message));
