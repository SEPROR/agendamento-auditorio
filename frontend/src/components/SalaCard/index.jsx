import { Building2, Users, CheckCircle2 } from "lucide-react";
import styles from "./index.module.css";

export function SalaCard({ sala, selected, onSelect }) {
  const cardClassName = [styles.card, selected ? styles.cardSelected : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" onClick={onSelect} className={cardClassName}>
      {selected && (
        <span className={styles.checkIcon}>
          <CheckCircle2 size={14} className={styles.checkIconColor} />
        </span>
      )}
      <Building2 size={18} className={selected ? styles.buildingIconSelected : styles.buildingIcon} />
      <span className={styles.name}>{sala.nome}</span>
      <span className={styles.capacity}>
        <Users size={10} /> {sala.capacidade} pessoas
      </span>
      {sala.hallOnly && (
        <span className={styles.hallBadge}>
          Dias 28–16
        </span>
      )}
    </button>
  );
}

export default SalaCard;