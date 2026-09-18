#!/usr/bin/env node
/**
 * Kiírja a lib/pets.ts-ben szereplő pet-neveket, soronként egyet, ABC-sorban.
 *
 * A .github/workflows/wiki-figyelo.yml ezt futtatja az import előtt és után,
 * és a két lista különbségéből állítja össze, mely petek kerültek be vagy
 * tűntek el. A `comm` miatt kell a rendezett kimenet.
 *
 *   node scripts/pet-nevek.mjs
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PETS = path.join(ROOT, 'lib', 'pets.ts');

if (!existsSync(PETS)) process.exit(0);

const source = await readFile(PETS, 'utf8');
const names = [...source.matchAll(/^\s{4}name: '((?:[^'\\]|\\.)*)',$/gm)].map(
  (match) => match[1].replace(/\\'/g, "'"),
);

// A wiki-figyelő a `comm`-mal hasonlít, az pedig rendezett bemenetet vár.
// Nem magyar sorrendben rendezünk, mert csak összehasonlításra kell.
console.log([...new Set(names)].sort().join('\n'));
