import Image from 'next/image';
import type { Pet } from '@/lib/types';
import {
  RARITY_LABELS,
  SOURCE_LABELS,
  primarySource,
  sourceColor,
} from '@/lib/types';
import styles from './PetCard.module.css';

interface PetCardProps {
  pet: Pet;
  owned: boolean;
  onToggle: (id: string) => void;
  /** Amíg a böngésző tárolóját nem olvastuk ki, a checkbox letiltva. */
  disabled: boolean;
  /** Csak akkor írjuk ki, ha az adatban van belőle többféle. */
  showRarity: boolean;
  showCategory: boolean;
}

export default function PetCard({
  pet,
  owned,
  onToggle,
  disabled,
  showRarity,
  showCategory,
}: PetCardProps) {
  const checkboxId = `pet-${pet.id}`;

  // A "Hol:" mind a 70 petnél ugyanazt ismételte, ami a lépésben már ott van
  // ("Megvásárolható Theowahdan NPC-nél" -> "Hol: Theowahdan"). Csak akkor
  // írjuk ki, ha tényleg új információ – pl. egy kézi kiegészítésnél.
  const stepText = (pet.acquisition ?? []).map((step) => step.text).join(' ');
  const showLocation = Boolean(
    pet.location && !stepText.includes(pet.location) &&
      !(pet.howToGet ?? '').includes(pet.location),
  );

  return (
    <article
      className={`${styles.card} ${owned ? styles.owned : ''}`}
      style={
        {
          '--rarity-color': `var(--rarity-${pet.rarity})`,
          '--source-color': sourceColor(primarySource(pet)),
        } as React.CSSProperties
      }
    >
      <div className={styles.header}>
        {pet.image ? (
          <Image
            src={pet.image}
            alt={`${pet.name} pet képe`}
            width={64}
            height={64}
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
          {(showRarity || showCategory) && (
            <div className={styles.meta}>
              {showRarity && (
                <span className={styles.rarity}>
                  {RARITY_LABELS[pet.rarity]}
                </span>
              )}
              {showRarity && showCategory && <span aria-hidden="true">·</span>}
              {showCategory && <span>{pet.category}</span>}
            </div>
          )}
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
            <span
              key={source}
              className={styles.badge}
              style={
                { '--source-color': sourceColor(source) } as React.CSSProperties
              }
            >
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
      ) : (pet.acquisition ?? []).length > 0 ? (
        <ul className={styles.steps}>
          {(pet.acquisition ?? []).map((step) => (
            <li
              key={`${step.kind}-${step.text}`}
              className={styles.step}
              style={
                { '--source-color': sourceColor(step.kind) } as React.CSSProperties
              }
            >
              <span className={styles.stepText}>{step.text}</span>
              {step.costs && step.costs.length > 0 && (
                <span className={styles.costs}>
                  {step.costs.map((cost) => (
                    <span key={cost} className={styles.cost}>
                      {cost}
                    </span>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.missing}>
          A wiki nem árulja el, honnan szerezhető meg.
        </p>
      )}

      {showLocation && (
        <p className={styles.detail}>
          <strong>Hol:</strong> {pet.location}
        </p>
      )}

      {pet.bonuses && pet.bonuses.length > 0 && (
        <div className={styles.bonusBlock}>
          <span className={styles.bonusLabel}>Bónuszok</span>
          <ul className={styles.bonuses}>
            {pet.bonuses.map((bonus) => (
              <li key={bonus}>{bonus}</li>
            ))}
          </ul>
        </div>
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
