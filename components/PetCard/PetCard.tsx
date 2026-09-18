import Image from 'next/image';
import type { Pet } from '@/lib/types';
import { RARITY_LABELS, SOURCE_LABELS } from '@/lib/types';
import styles from './PetCard.module.css';

interface PetCardProps {
  pet: Pet;
  owned: boolean;
  onToggle: (id: string) => void;
  /** Amíg a böngésző tárolóját nem olvastuk ki, a checkbox letiltva. */
  disabled: boolean;
}

export default function PetCard({
  pet,
  owned,
  onToggle,
  disabled,
}: PetCardProps) {
  const checkboxId = `pet-${pet.id}`;

  return (
    <article
      className={`${styles.card} ${owned ? styles.owned : ''}`}
      style={{ '--rarity-color': `var(--rarity-${pet.rarity})` } as React.CSSProperties}
    >
      <div className={styles.header}>
        {pet.image ? (
          <Image
            src={pet.image}
            alt={`${pet.name} pet képe`}
            width={48}
            height={48}
            className={styles.thumb}
          />
        ) : (
          <div className={styles.thumbFallback} aria-hidden="true">
            {pet.name.charAt(0)}
          </div>
        )}

        <div className={styles.titleBlock}>
          <label className={styles.name} htmlFor={checkboxId}>
            {pet.name}
          </label>
          <div className={styles.meta}>
            <span className={styles.rarity}>{RARITY_LABELS[pet.rarity]}</span>
            <span aria-hidden="true">·</span>
            <span>{pet.category}</span>
          </div>
        </div>

        <input
          id={checkboxId}
          type="checkbox"
          className={styles.checkbox}
          checked={owned}
          disabled={disabled}
          onChange={() => onToggle(pet.id)}
          aria-label={`${pet.name} – megvan`}
        />
      </div>

      <div className={styles.badges}>
        {pet.sources.length > 0 ? (
          pet.sources.map((source) => (
            <span key={source} className={styles.badge}>
              {SOURCE_LABELS[source]}
            </span>
          ))
        ) : (
          <span className={`${styles.badge} ${styles.badgeUnknown}`}>
            Megszerzés ismeretlen
          </span>
        )}
      </div>

      {pet.howToGet ? (
        <p className={styles.how}>{pet.howToGet}</p>
      ) : (
        <p className={styles.missing}>
          A wiki nem árulja el, honnan szerezhető meg.
        </p>
      )}

      {pet.location && (
        <p className={styles.detail}>
          <strong>Hol:</strong> {pet.location}
        </p>
      )}

      {pet.bonuses && pet.bonuses.length > 0 && (
        <ul className={styles.bonuses}>
          {pet.bonuses.map((bonus) => (
            <li key={bonus}>{bonus}</li>
          ))}
        </ul>
      )}

      {pet.notes && <p className={styles.notes}>{pet.notes}</p>}

      {pet.wikiUrl && (
        <a
          className={styles.wikiLink}
          href={pet.wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Wiki oldal →
        </a>
      )}
    </article>
  );
}
