#!/usr/bin/env node
/**
 * ============================================================
 *  PET-IMPORT A SZERVER WIKIJÉRŐL
 * ============================================================
 *
 * Kiszedi a peteket a wiki lista-oldaláról, letölti a képeket a
 * public/images/pets/ mappába, és legenerálja a lib/pets.ts fájlt.
 *
 * Használat:
 *
 *   # a szokásos út: előbb a fetch-szkript szedi le az adatot a wiki API-jából
 *   node scripts/fetch-wiki-pets.mjs
 *   node scripts/import-pets.mjs ./wiki-pets.json
 *
 *   # egy lementett oldalból (Ctrl+S, vagy DevTools -> Copy outerHTML)
 *   node scripts/import-pets.mjs ./wiki.html
 *
 *   # közvetlenül egy lista-oldalról (a wiki listája JS-sel tölt, így NEM megy)
 *   node scripts/import-pets.mjs "https://pelda.hu/petek"
 *
 * Kapcsolók:
 *   --dry-run          nem ír fájlt, csak kilistázza, mit talált
 *   --no-images        nem tölti le a képeket
 *   --category "..."   kategória minden importált petnek (alap: "Pet kosztüm")
 *   --rarity common    ritkaság minden importált petnek (alap: "common")
 *   --pages 5          hány lapot kérjen le (alap: addig megy, amíg új pet jön)
 *   --out lib/pets.ts  kimeneti fájl
 *
 * A `bonuses` mezőt a bemenetből veszi át (a fetch-szkript tölti ki a wiki
 * apply-adataiból). A `rarity` a wikiben nincs benne, ezért minden petnél a
 * --rarity alapérték kerül be.
 *
 * Az `id` mezőt a szkript a meglévő lib/pets.ts-ből veszi át, ha a pet neve
 * változatlan – így egy újbóli import nem törli le a látogatók pipáit.
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_DIR = path.join(ROOT, 'public', 'images', 'pets');

// ---------------------------------------------------------------- argumentumok

function parseArgs(argv) {
  const opts = {
    input: null,
    dryRun: false,
    images: true,
    category: 'Pet kosztüm',
    rarity: 'common',
    pages: null,
    out: path.join(ROOT, 'lib', 'pets.ts'),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--no-images') opts.images = false;
    else if (arg === '--category') opts.category = argv[++i];
    else if (arg === '--rarity') opts.rarity = argv[++i];
    else if (arg === '--pages') opts.pages = Number(argv[++i]);
    else if (arg === '--out') opts.out = path.resolve(ROOT, argv[++i]);
    else if (arg.startsWith('-')) fail(`Ismeretlen kapcsoló: ${arg}`);
    else if (!opts.input) opts.input = arg;
    else fail(`Túl sok argumentum: ${arg}`);
  }
  if (!opts.input) {
    fail(
      'Adj meg egy wiki URL-t vagy egy lementett HTML/JSON fájlt.\n' +
        '  node scripts/import-pets.mjs "https://wiki.venor2.hu/items?type=ITEM_COSTUME&subtype=COSTUME_PET"',
    );
  }
  const RARITIES = ['common', 'rare', 'epic', 'legendary'];
  if (!RARITIES.includes(opts.rarity)) {
    fail(`A --rarity csak ez lehet: ${RARITIES.join(', ')}`);
  }
  return opts;
}

function fail(message) {
  console.error(`\nHIBA: ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------- szövegkezelés

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  eacute: 'é', aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú',
  ouml: 'ö', uuml: 'ü', Ouml: 'Ö', Uuml: 'Ü',
  Eacute: 'É', Aacute: 'Á', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
};

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name] ?? match);
}

/** HTML-részletből tiszta, egysoros szöveg. */
function stripTags(html) {
  return decodeEntities(
    String(html)
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Tűz Sárkány" -> "tuz-sarkany" (ékezet nélkül, url-barát). */
function slugify(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// ---------------------------------------------------------------- oldal-betöltés

const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;
if (PROXY && !process.env.NODE_USE_ENV_PROXY) {
  console.warn(
    'Figyelem: HTTPS_PROXY be van állítva, de a Node beépített fetch-e csak\n' +
      'NODE_USE_ENV_PROXY=1 mellett használja. Ha időtúllépést kapsz, futtasd így:\n' +
      '  NODE_USE_ENV_PROXY=1 node scripts/import-pets.mjs ...\n',
  );
}

const USER_AGENT =
  'Mozilla/5.0 (compatible; metin2-pet-tracker importer; +https://github.com/)';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

const isUrl = (value) => /^https?:\/\//i.test(value);

/**
 * Visszaadja a feldolgozandó oldalakat. URL esetén lapoz is: addig kéri a
 * következő lapot, amíg új peteket talál rajta.
 */
async function loadPages(input, maxPages, extract) {
  if (!isUrl(input)) {
    const file = path.resolve(process.cwd(), input);
    if (!existsSync(file)) fail(`Nincs ilyen fájl: ${file}`);
    console.log(`Beolvasás: ${file}`);
    return [{ body: await readFile(file, 'utf8'), baseUrl: null }];
  }

  const pages = [];
  const seenNames = new Set();
  const limit = Number.isFinite(maxPages) && maxPages > 0 ? maxPages : 50;

  for (let page = 1; page <= limit; page += 1) {
    const url = new URL(input);
    if (page > 1) url.searchParams.set('page', String(page));

    let body;
    try {
      console.log(`Letöltés: ${url}`);
      body = await fetchText(url.toString());
    } catch (err) {
      if (page === 1) fail(`Nem sikerült letölteni az oldalt: ${err.message}`);
      console.log(`  (${page}. lap nem elérhető – vége)`);
      break;
    }

    const items = extract(body, url.toString());
    const fresh = items.filter((item) => !seenNames.has(item.name));
    console.log(`  ${items.length} találat, ebből ${fresh.length} új`);

    if (fresh.length === 0) break;
    fresh.forEach((item) => seenNames.add(item.name));
    pages.push({ body, baseUrl: url.toString() });

    // Ha a --pages nincs megadva és nem volt lapozás-jel, egy lap is elég lehet;
    // a ciklus magától leáll, amint egy lap nem hoz új petet.
  }

  return pages;
}

// ---------------------------------------------------------------- JSON-keresés

const NAME_KEYS = ['name', 'item_name', 'itemname', 'localizedname', 'displayname', 'title', 'nev', 'név'];
const VNUM_KEYS = ['vnum', 'item_vnum', 'itemvnum', 'id', 'item_id', 'itemid'];
const IMAGE_KEYS = ['image', 'img', 'icon', 'iconurl', 'icon_url', 'image_url', 'imageurl', 'thumbnail', 'icon_path', 'iconpath'];
const DESC_KEYS = ['description', 'desc', 'info', 'tooltip', 'text', 'leiras', 'leírás'];
const LINK_KEYS = ['wikiurl', 'wiki_url', 'url', 'link', 'href'];
const BONUS_KEYS = ['bonuses', 'bonus', 'applies', 'affects', 'bonuszok'];
const SOURCE_KEYS = ['sources', 'source', 'forrasok'];
const HOWTO_KEYS = ['howtoget', 'how_to_get', 'howto', 'megszerzes'];
const PLACE_KEYS = ['location', 'place', 'hely', 'map'];

/** A lib/types.ts PetSource értékei – ismeretlen címkét nem írunk ki. */
const VALID_SOURCES = [
  'event', 'shop', 'drop', 'boss', 'dungeon',
  'quest', 'craft', 'trade', 'donate', 'other',
];

function pick(obj, keys) {
  for (const key of Object.keys(obj)) {
    if (keys.includes(key.toLowerCase())) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }
  }
  return null;
}

const looksLikeItem = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) && pick(value, NAME_KEYS);

/** Szöveges tömb egy objektumból: csak a nem üres elemeket tartjuk meg. */
function pickList(obj, keys) {
  for (const key of Object.keys(obj)) {
    if (!keys.includes(key.toLowerCase())) continue;
    const value = obj[key];
    if (!Array.isArray(value)) continue;
    return value
      .map((entry) => stripTags(typeof entry === 'string' ? entry : (entry?.label ?? '')))
      .filter(Boolean);
  }
  return [];
}

/** Megszerzési címkék, az ismeretlen értékeket eldobva. */
function pickSources(obj) {
  return pickList(obj, SOURCE_KEYS).filter((source) => VALID_SOURCES.includes(source));
}

/** Megkeresi a JSON-ban a legnagyobb olyan tömböt, ami item-szerű objektumokból áll. */
function findItemArray(node, best = { items: [] }) {
  if (Array.isArray(node)) {
    const items = node.filter(looksLikeItem);
    if (items.length > best.items.length && items.length >= node.length / 2) {
      best.items = items;
    }
    node.forEach((child) => findItemArray(child, best));
  } else if (node && typeof node === 'object') {
    Object.values(node).forEach((child) => findItemArray(child, best));
  }
  return best.items;
}

function normalizeJsonItem(raw, baseUrl) {
  return {
    name: stripTags(pick(raw, NAME_KEYS) ?? ''),
    vnum: pick(raw, VNUM_KEYS),
    image: absoluteUrl(pick(raw, IMAGE_KEYS), baseUrl),
    description: stripTags(pick(raw, DESC_KEYS) ?? ''),
    wikiUrl: absoluteUrl(pick(raw, LINK_KEYS), baseUrl),
    bonuses: pickList(raw, BONUS_KEYS),
    sources: pickSources(raw),
    howToGet: stripTags(pick(raw, HOWTO_KEYS) ?? ''),
    location: stripTags(pick(raw, PLACE_KEYS) ?? ''),
  };
}

// ---------------------------------------------------------------- HTML-keresés

function absoluteUrl(value, baseUrl) {
  if (!value) return null;
  if (/^data:/i.test(value)) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!baseUrl) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return match ? decodeEntities(match[2] ?? match[3] ?? '') : null;
};

/** Az első <img> src-je (srcset esetén az első URL) egy HTML-részletből. */
function firstImage(html, baseUrl) {
  const tag = html.match(/<img\b[^>]*>/i);
  if (!tag) return { src: null, alt: null };
  const src =
    attr(tag[0], 'src') ||
    attr(tag[0], 'data-src') ||
    (attr(tag[0], 'srcset') || '').split(',')[0]?.trim().split(/\s+/)[0] ||
    null;
  return { src: absoluteUrl(src, baseUrl), alt: attr(tag[0], 'alt') };
}

/** Táblázatos lista: soronként egy pet. */
function extractFromRows(html, baseUrl) {
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
  const items = [];
  for (const row of rows) {
    // Fejlécsor, és minden olyan sor, amiben nincs se kép, se link: nem pet.
    if (/<th\b/i.test(row)) continue;
    if (!/<img\b/i.test(row) && !/<a\b/i.test(row)) continue;

    const { src, alt } = firstImage(row, baseUrl);
    const cells = (row.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi) ?? [])
      .map(stripTags)
      .filter(Boolean);
    const name = cells.find((cell) => cell.length > 1 && !/^\d+$/.test(cell)) || alt;
    if (!name) continue;
    const link = row.match(/<a\b[^>]*href\s*=\s*"([^"]+)"/i);
    items.push({
      name: stripTags(name),
      vnum: cells.find((cell) => /^\d{3,}$/.test(cell)) ?? null,
      image: src,
      description: '',
      wikiUrl: absoluteUrl(link?.[1] ?? null, baseUrl),
    });
  }
  return items;
}

/** Kártyás/linkes lista: minden item egy <a>, benne képpel. */
function extractFromLinks(html, baseUrl) {
  const anchors = html.match(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<\/a>/gi) ?? [];
  const items = [];
  for (const anchor of anchors) {
    if (!/<img\b/i.test(anchor)) continue;
    const { src, alt } = firstImage(anchor, baseUrl);
    const name = stripTags(anchor) || alt;
    if (!name || name.length < 2) continue;
    items.push({
      name: stripTags(name),
      vnum: (anchor.match(/\/(?:item|items)\/(\d{3,})/i) ?? [])[1] ?? null,
      image: src,
      description: '',
      wikiUrl: absoluteUrl(attr(anchor, 'href'), baseUrl),
    });
  }
  return items;
}

/** Egy oldal (HTML vagy JSON) -> nyers pet-találatok. */
function extractItems(body, baseUrl) {
  const trimmed = body.trim();

  // 1. Tiszta JSON (API-válasz vagy lementett JSON fájl)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const items = findItemArray(JSON.parse(trimmed));
      if (items.length) return items.map((raw) => normalizeJsonItem(raw, baseUrl));
    } catch {
      /* nem JSON, megyünk tovább */
    }
  }

  // 2. Beágyazott JSON (Next.js / Nuxt / bármi, ami application/json script)
  const jsonScripts =
    body.match(/<script\b[^>]*type\s*=\s*"application\/json"[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const script of jsonScripts) {
    const payload = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '');
    try {
      const items = findItemArray(JSON.parse(payload));
      if (items.length) return items.map((raw) => normalizeJsonItem(raw, baseUrl));
    } catch {
      /* nem ez volt */
    }
  }

  // 3. Sima HTML – a többet adó stratégia nyer
  const rows = extractFromRows(body, baseUrl);
  const links = extractFromLinks(body, baseUrl);
  return rows.length >= links.length ? rows : links;
}

// ---------------------------------------------------------------- id-megőrzés

/** A meglévő lib/pets.ts-ből kiolvassa a név -> id párokat. */
async function readExistingIds(outFile) {
  if (!existsSync(outFile)) return new Map();
  const source = await readFile(outFile, 'utf8');
  const map = new Map();
  const pattern = /id:\s*'([^']+)',\s*\n\s*name:\s*'((?:[^'\\]|\\.)*)'/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    map.set(match[2].replace(/\\'/g, "'"), match[1]);
  }
  return map;
}

// ---------------------------------------------------------------- képletöltés

const EXT_BY_TYPE = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

/** A wiki kapcsolata időnként megszakad, ezért néhányszor újrapróbáljuk. */
async function fetchImage(url, attempts = 8) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

async function downloadImage(url, id) {
  const res = await fetchImage(url);

  const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const fromUrl = (new URL(url).pathname.match(/\.(png|jpe?g|gif|webp|svg)$/i) ?? [])[0];
  const ext = EXT_BY_TYPE[type] ?? (fromUrl ? fromUrl.toLowerCase().replace('.jpeg', '.jpg') : '.png');

  const file = path.join(IMAGE_DIR, `${id}${ext}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return `/images/pets/${id}${ext}`;
}

// ---------------------------------------------------------------- TS-generálás

const quote = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function renderPet(pet) {
  const lines = [
    `    id: ${quote(pet.id)},`,
    `    name: ${quote(pet.name)},`,
    `    category: ${quote(pet.category)},`,
    `    rarity: ${quote(pet.rarity)},`,
    `    sources: [${pet.sources.map(quote).join(', ')}],`,
  ];
  if (pet.howToGet) lines.push(`    howToGet: ${quote(pet.howToGet)},`);
  if (pet.location) lines.push(`    location: ${quote(pet.location)},`);
  if (pet.bonuses.length > 0) {
    lines.push(`    bonuses: [${pet.bonuses.map(quote).join(', ')}],`);
  }
  if (pet.image) lines.push(`    image: ${quote(pet.image)},`);
  if (pet.wikiUrl) lines.push(`    wikiUrl: ${quote(pet.wikiUrl)},`);
  if (pet.notes) lines.push(`    notes: ${quote(pet.notes)},`);
  return `  {\n${lines.join('\n')}\n  },`;
}

function renderPetsFile(pets, sourceLabel) {
  return `import type { Pet } from './types';

/**
 * ============================================================
 *  PET-LISTA
 * ============================================================
 *
 * Ezt a fájlt a scripts/import-pets.mjs generálta a szerver wikijéről:
 * ${sourceLabel}
 *
 * Kézzel is nyugodtan szerkeszthető, de egy újabb import felülírja – tartós
 * változtatáshoz inkább a wikit vagy a szkriptet igazítsd.
 *
 * A \`bonuses\` a játék nyers apply-mezőiből jön, a wiki magyar feliratával
 * (pl. "Szörnyek elleni erő +3%"). A \`rarity\` a wikiben nincs benne, ezért
 * minden petnél az importálás alapértéke áll – ha akarod, kézzel állítsd:
 *
 *   rarity = 'common' | 'rare' | 'epic' | 'legendary'
 *
 * FONTOS: az \`id\` mezőt utólag NE írd át! A látogatók pipái ez alapján
 * vannak elmentve, egy átnevezett id-nél elveszik a jelölés. Az importáló
 * szkript ezért a meglévő id-ket név alapján megtartja.
 */

/** Amíg true, az oldal tetején figyelmeztet, hogy ezek példaadatok. */
export const IS_SAMPLE_DATA = false;

export const PETS: Pet[] = [
${pets.map(renderPet).join('\n')}
];
`;
}

// ---------------------------------------------------------------- futtatás

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const pages = await loadPages(opts.input, opts.pages, extractItems);

  const byName = new Map();
  for (const page of pages) {
    for (const item of extractItems(page.body, page.baseUrl)) {
      if (!item.name) continue;
      if (!byName.has(item.name)) byName.set(item.name, item);
    }
  }
  const found = [...byName.values()];

  if (found.length === 0) {
    fail(
      'Egyetlen petet sem találtam az oldalon.\n' +
        'Ha a wiki JavaScripttel tölti be a listát, a nyers HTML-ben tényleg nincs adat.\n' +
        'Ilyenkor:\n' +
        '  1. nyisd meg az oldalt a böngészőben, várd meg amíg betölt,\n' +
        '  2. DevTools (F12) -> Elements -> jobb klikk a <html>-en -> Copy -> Copy outerHTML,\n' +
        '  3. mentsd wiki.html néven, és futtasd: node scripts/import-pets.mjs ./wiki.html\n' +
        'Vagy a DevTools Network fülén keresd meg a lista JSON-válaszát, mentsd le,\n' +
        'és azt add meg a szkriptnek.',
    );
  }

  const existingIds = await readExistingIds(opts.out);
  const usedIds = new Set();
  const pets = found.map((item) => {
    let id = existingIds.get(item.name) ?? slugify(item.name) ?? '';
    if (!id) id = item.vnum ? `pet-${item.vnum}` : 'pet';
    let unique = id;
    let counter = 2;
    while (usedIds.has(unique)) unique = `${id}-${counter++}`;
    usedIds.add(unique);

    return {
      id: unique,
      name: item.name,
      category: opts.category,
      rarity: opts.rarity,
      sources: item.sources ?? [],
      howToGet: item.howToGet || null,
      location: item.location || null,
      bonuses: item.bonuses ?? [],
      image: null,
      remoteImage: item.image,
      wikiUrl: item.wikiUrl,
      notes: item.description || null,
    };
  });

  console.log(`\n${pets.length} pet a wikiről:`);
  pets.forEach((pet) => console.log(`  - ${pet.name}  (id: ${pet.id})`));

  if (opts.images && !opts.dryRun) {
    await mkdir(IMAGE_DIR, { recursive: true });
    let ok = 0;
    let skipped = 0;
    console.log('\nKépek letöltése...');
    for (const pet of pets) {
      if (!pet.remoteImage) {
        skipped += 1;
        continue;
      }
      try {
        pet.image = await downloadImage(pet.remoteImage, pet.id);
        ok += 1;
      } catch (err) {
        skipped += 1;
        console.warn(`  nem sikerült: ${pet.name} (${err.message})`);
      }
    }
    console.log(`  ${ok} kép letöltve, ${skipped} kimaradt (ezek kép nélkül jelennek meg)`);
  }

  if (opts.dryRun) {
    console.log('\n--dry-run: nem írtam fájlt.');
    return;
  }

  await writeFile(opts.out, renderPetsFile(pets, opts.input), 'utf8');
  console.log(`\nKész: ${path.relative(ROOT, opts.out)} (${pets.length} pet)`);

  const images = existsSync(IMAGE_DIR) ? (await readdir(IMAGE_DIR)).filter((f) => f !== '.gitkeep') : [];
  console.log(`Képek: public/images/pets/ (${images.length} fájl)`);
  console.log('\nEllenőrzés:  npm run dev   ->  http://localhost:3000');
}

main().catch((err) => fail(err.stack ?? err.message));
