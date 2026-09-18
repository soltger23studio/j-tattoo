'use client';

import { useCallback, useEffect, useState } from 'react';

/** A localStorage kulcs. Ha ezt megváltoztatod, mindenki pipái "elvesznek". */
const STORAGE_KEY = 'metin2-pet-collection-v1';

/** Az export/import kód előtagja – ebből tudjuk, hogy tényleg a mi kódunk. */
const EXPORT_PREFIX = 'M2PET1:';

function readStorage(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    // Privát böngészés vagy letiltott tárolás – ilyenkor üresen indulunk.
    return [];
  }
}

export function useCollection() {
  const [owned, setOwned] = useState<Set<string>>(() => new Set());
  /** Amíg false, még nem olvastuk ki a böngésző tárolóját (SSR miatt kell). */
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setOwned(new Set(readStorage()));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...owned]));
    } catch {
      // Ha nem tudunk menteni, az oldal attól még használható marad.
    }
  }, [owned, loaded]);

  const toggle = useCallback((id: string) => {
    setOwned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const markMany = useCallback((ids: string[], value: boolean) => {
    setOwned((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (value) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  }, []);

  const replaceAll = useCallback((ids: string[]) => {
    setOwned(new Set(ids));
  }, []);

  const reset = useCallback(() => setOwned(new Set()), []);

  return { owned, loaded, toggle, markMany, replaceAll, reset };
}

/** A gyűjteményből megosztható szöveges kódot csinál. */
export function encodeCollection(ids: string[]): string {
  const payload = JSON.stringify({ v: 1, ids });
  const bytes = new TextEncoder().encode(payload);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return EXPORT_PREFIX + window.btoa(binary);
}

/** Beolvas egy kódot. Hibás kódnál null-t ad vissza. */
export function decodeCollection(code: string): string[] | null {
  try {
    const trimmed = code.trim();
    const body = trimmed.startsWith(EXPORT_PREFIX)
      ? trimmed.slice(EXPORT_PREFIX.length)
      : trimmed;
    const binary = window.atob(body);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as { ids?: unknown }).ids)
    ) {
      return null;
    }
    return (parsed as { ids: unknown[] }).ids.filter(
      (item): item is string => typeof item === 'string',
    );
  } catch {
    return null;
  }
}
