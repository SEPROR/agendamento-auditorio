import { CheckCircle2 } from "lucide-react";
import styles from "./index.module.css";

export function SuccessScreen({ onReset }) {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <div className={styles.iconCircle}>
          <CheckCircle2 size={40} className={styles.icon} />
        </div>
        <div className={styles.pingRing} />
      </div>
      <div className={styles.textGroup}>
        <h2 className={styles.title}>Agendamento Confirmado</h2>
        <p className={styles.subtitle}>
          Sua reserva foi registrada com sucesso. Você receberá uma confirmação em breve.
        </p>
      </div>
      <button onClick={onReset} className={styles.resetButton}>
        Novo agendamento
      </button>
    </div>
  );
}

export default SuccessScreen;