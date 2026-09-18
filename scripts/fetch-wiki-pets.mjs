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
 *
 * Honnan jön a három adat:
 *   - nevek + bónuszok:  /api/items         (type=ITEM_COSTUME, sub_type=COSTUME_PET)
 *   - ikonok:            /api/icon-manifest (vnum -> fájlnév)
 *   - bónusz-feliratok:  a wiki JS bundle-jéből (ld. lentebb)
 *
 * A bónuszok a játék nyers `apply_type0..3` / `apply_value0..3` mezőiben
 * vannak, pl. APPLY_ATTBONUS_MONSTER = 1. Az ember által olvasható magyar
 * felirat ("Szörnyek elleni erő +%d%%") a wiki JS-ében él, ezért onnan
 * szedjük ki. Ha a wiki újraépül és ez nem sikerül, a szkript figyelmeztet
 * és a nyers nevet írja ki – ilyenkor a lib/pets.ts marad a régi, amíg
 * nem futtatod újra.
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

function fail(message) {
  console.error(`\nHIBA: ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------- argumentumok

function parseArgs(argv) {
  const opts = { out: path.join(ROOT, 'wiki-pets.json'), locale: 'hu' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') opts.out = path.resolve(process.cwd(), argv[++i]);
    else if (arg === '--locale') opts.locale = argv[++i];
    else fail(`Ismeretlen kapcsoló: ${arg}`);
  }
  return opts;
}

// ---------------------------------------------------------------- letöltés

/**
 * A wiki kapcsolata megbízhatatlan (időnként connection reset), ezért
 * minden kérést újrapróbálunk növekvő várakozással.
 */
async function fetchWithRetry(url, { attempts = 6, asJson = false } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return asJson ? await res.json() : await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        const wait = 500 * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }
  throw new Error(`${url} -> ${lastError.message}`);
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

// ---------------------------------------------------------------- futtatás

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log('Bónusz-feliratok a wiki JS-éből...');
  const labelTable = await loadApplyLabels();

  console.log('Itemek letöltése...');
  const items = await fetchWithRetry(`${WIKI}/api/items?locale=${opts.locale}`, {
    asJson: true,
  });

  console.log('Ikon-lista letöltése...');
  const manifest = await fetchWithRetry(`${WIKI}/api/icon-manifest`, { asJson: true });
  const icons = manifest.items ?? {};

  const pets = items
    .filter((item) => item.type === 'ITEM_COSTUME' && item.sub_type === 'COSTUME_PET')
    .sort((a, b) => a.vnum - b.vnum);

  if (pets.length === 0) fail('egyetlen pet kosztümöt sem találtam az API válaszában');

  const unknown = new Set();
  let withoutIcon = 0;

  const rows = pets.map((item) => {
    const icon = icons[String(item.vnum)];
    if (!icon) withoutIcon += 1;
    return {
      name: (item.locale_name || item.name || '').trim(),
      vnum: item.vnum,
      image: icon ? `${WIKI}/assets/icons/${icon}` : null,
      wikiUrl: `${WIKI}/items/${item.vnum}`,
      bonuses: readBonuses(item, labelTable, unknown),
    };
  });

  const withoutBonus = rows.filter((row) => row.bonuses.length === 0).length;

  await writeFile(opts.out, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

  console.log(`\n${rows.length} pet -> ${path.relative(ROOT, opts.out)}`);
  if (withoutIcon > 0) console.log(`  ${withoutIcon} petnek nincs ikonja`);
  if (withoutBonus > 0) console.log(`  ${withoutBonus} petnek nincs bónusza`);
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
