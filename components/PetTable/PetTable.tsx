import type { Pet } from '@/lib/types';
import { RARITY_LABELS } from '@/lib/types';
import styles from './PetTable.module.css';

interface PetTableProps {
  pets: Pet[];
  owned: Set<string>;
  onToggle: (id: string) => void;
  disabled: boolean;
}

/** Tömör nézet – nagy (több százas) pet-listához kényelmesebb, mint a kártyák. */
export default function PetTable({
  pets,
  owned,
  onToggle,
  disabled,
}: PetTableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.checkCell}>
              <span className="sr-only">Megvan</span>
            </th>
            <th>Név</th>
            <th>Ritkaság</th>
            <th className={styles.hideOnMobile}>Kategória</th>
            <th>Bónuszok</th>
          </tr>
        </thead>
        <tbody>
          {pets.map((pet) => {
            const isOwned = owned.has(pet.id);
            const checkboxId = `row-${pet.id}`;
            return (
              <tr
                key={pet.id}
                className={`${styles.row} ${isOwned ? styles.ownedRow : ''}`}
              >
                <td className={styles.checkCell}>
                  <input
                    id={checkboxId}
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isOwned}
                    disabled={disabled}
                    onChange={() => onToggle(pet.id)}
                    aria-label={`${pet.name} – megvan`}
                  />
                </td>
                <td>
                  <label className={styles.name} htmlFor={checkboxId}>
                    {pet.name}
                  </label>
                </td>
                <td
                  className={styles.rarity}
                  style={
                    {
                      '--rarity-color': `var(--rarity-${pet.rarity})`,
                    } as React.CSSProperties
                  }
                >
                  {RARITY_LABELS[pet.rarity]}
                </td>
                <td className={styles.hideOnMobile}>{pet.category}</td>
                <td>
                  <div className={styles.badges}>
                    {pet.bonuses && pet.bonuses.length > 0 ? (
                      pet.bonuses.map((bonus) => (
                        <span key={bonus} className={styles.badge}>
                          {bonus}
                        </span>
                      ))
                    ) : (
                      <span className={styles.missing}>nincs megadva</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
