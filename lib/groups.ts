import type { Pet } from './types';

/**
 * ============================================================
 *  FÜLEK – HOL SZEREZHETŐ MEG A PET
 * ============================================================
 *
 * Minden pet PONTOSAN EGY fülre kerül, hogy a fülek számai kiadják a 70-et,
 * és ne kelljen ugyanazt a petet több helyen keresgélni. Sok petnek viszont
 * több forrása van (pl. bossból is esik ÉS eventen is elérhető), ezért a
 * lenti sorrend dönt: az első illeszkedő fül nyer.
 *
 * A sorrend szándékosan a "hova menjek érte" logikát követi: ha egy konkrét
 * NPC-nél megvehető, az a legkézzelfoghatóbb válasz, ezért az előre kerül.
 *
 * Új fül felvétele: írj be egy új bejegyzést a GROUPS tömbbe a megfelelő
 * helyre. A kártyákon a teljes megszerzési leírás így is látszik, tehát a
 * besorolás csak a navigációt egyszerűsíti, infót nem rejt el.
 */

export interface PetGroup {
  id: string;
  label: string;
  /** A fül alatti rövid magyarázat. */
  hint: string;
  matches: (pet: Pet) => boolean;
}

const soldBy = (pet: Pet, npc: string) =>
  (pet.npcs ?? []).some((name) => name === npc);

export const GROUPS: PetGroup[] = [
  {
    id: 'vegyeskereskedo',
    label: 'Vegyeskereskedő',
    hint: 'A Vegyeskereskedő Eladónőnél megvásárolható petek.',
    matches: (pet) => soldBy(pet, 'Vegyeskereskedő Eladónő'),
  },
  {
    id: 'theowahdan',
    label: 'Theowahdan',
    hint: 'A Theowahdan NPC-nél megvásárolható petek – jellemzően fejlesztéssel.',
    matches: (pet) => soldBy(pet, 'Theowahdan'),
  },
  {
    id: 'event',
    label: 'Esemény',
    hint: 'Eseményhez kötött petek: event-NPC-nél vagy event-ládából szerezhetők.',
    matches: (pet) => pet.sources.includes('event'),
  },
  {
    id: 'kazamata',
    label: 'Kazamata',
    hint: 'Kazamatában, jellemzően a végső bossból szerezhető petek.',
    matches: (pet) => pet.sources.includes('dungeon'),
  },
  {
    id: 'egyeb',
    label: 'Egyéb',
    hint:
      'Ami egyik fenti csoportba sem fért: más NPC-k kínálata, kazamatán ' +
      'kívüli bossok, és az a néhány pet, amiről a wiki nem árulja el, ' +
      'honnan szerezhető.',
    // Mindent elnyel, ami idáig eljutott – így egy pet sem tűnik el.
    matches: () => true,
  },
];

/** Melyik fülre kerül ez a pet. Mindig ad választ (legrosszabb esetben 'egyeb'). */
export function groupOf(pet: Pet): string {
  return (GROUPS.find((group) => group.matches(pet)) ?? GROUPS[GROUPS.length - 1]).id;
}
