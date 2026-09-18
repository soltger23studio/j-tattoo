'use client';

import { useState } from 'react';
import { decodeCollection, encodeCollection } from '@/lib/useCollection';
import styles from './CollectionTools.module.css';

interface CollectionToolsProps {
  ownedIds: string[];
  onImport: (ids: string[]) => void;
  onReset: () => void;
}

type OpenPanel = 'none' | 'export' | 'import';

export default function CollectionTools({
  ownedIds,
  onImport,
  onReset,
}: CollectionToolsProps) {
  const [panel, setPanel] = useState<OpenPanel>('none');
  const [exportCode, setExportCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const say = (text: string, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const handleExport = () => {
    if (panel === 'export') {
      setPanel('none');
      return;
    }
    setExportCode(encodeCollection(ownedIds));
    setPanel('export');
    say('');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      say('Kód a vágólapra másolva.');
    } catch {
      say('A másolás nem sikerült – jelöld ki a kódot és másold ki kézzel.', true);
    }
  };

  const handleImport = () => {
    const ids = decodeCollection(importCode);
    if (!ids) {
      say('Ez a kód érvénytelen. Ellenőrizd, hogy a teljes kódot bemásoltad-e.', true);
      return;
    }
    const confirmed = window.confirm(
      `A betöltés felülírja a jelenlegi gyűjteményedet (${ownedIds.length} pet). Biztosan folytatod?`,
    );
    if (!confirmed) return;
    onImport(ids);
    setImportCode('');
    setPanel('none');
    say(`${ids.length} pet betöltve.`);
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      'Biztosan törlöd az összes pipát? Ez nem vonható vissza.',
    );
    if (!confirmed) return;
    onReset();
    setPanel('none');
    say('A gyűjtemény törölve.');
  };

  return (
    <section className={styles.tools} aria-label="Gyűjtemény mentése és betöltése">
      <div className={styles.title}>Gyűjtemény mentése / átvitele</div>
      <p className={styles.hint}>
        A pipáid ebben a böngészőben vannak elmentve. Ha másik gépen vagy
        telefonon is látni akarod őket, mentsd ki kódként és töltsd be ott.
      </p>

      <div className={styles.buttons}>
        <button type="button" className={styles.button} onClick={handleExport}>
          Kód készítése
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            setPanel(panel === 'import' ? 'none' : 'import');
            say('');
          }}
        >
          Kód betöltése
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.danger}`}
          onClick={handleReset}
        >
          Összes pipa törlése
        </button>
      </div>

      {panel === 'export' && (
        <div className={styles.panel}>
          <textarea
            className={styles.textarea}
            readOnly
            value={exportCode}
            aria-label="A gyűjteményed kódja"
            onFocus={(event) => event.target.select()}
          />
          <div className={styles.buttons}>
            <button type="button" className={styles.button} onClick={handleCopy}>
              Másolás
            </button>
          </div>
        </div>
      )}

      {panel === 'import' && (
        <div className={styles.panel}>
          <textarea
            className={styles.textarea}
            value={importCode}
            placeholder="Illeszd be ide a korábban kimentett kódot…"
            aria-label="Betöltendő kód"
            onChange={(event) => setImportCode(event.target.value)}
          />
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.button}
              onClick={handleImport}
              disabled={importCode.trim().length === 0}
            >
              Betöltés
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={`${styles.message} ${isError ? styles.error : ''}`}>
          {message}
        </p>
      )}
    </section>
  );
}
