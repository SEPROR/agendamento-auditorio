import { createPortal } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import styles from "./index.module.css";

export function SuccessScreen({ onReset }) {
  return createPortal(
    <div className={`${styles.modalOverlay} ${styles.open}`}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
      >
        <div className={styles.container}>
          <div className={styles.iconWrapper}>
            <div className={styles.iconCircle}>
              <CheckCircle2 size={40} className={styles.icon} />
            </div>
            <div className={styles.pingRing} />
          </div>
          <div className={styles.textGroup}>
            <h2 id="success-title" className={styles.title}>
              Agendamento Confirmado
            </h2>
            <p className={styles.subtitle}>
              Fique atento ao seu e-mail para a confirmação da reserva.
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className={styles.resetButton}
            autoFocus
          >
            Ok
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SuccessScreen;