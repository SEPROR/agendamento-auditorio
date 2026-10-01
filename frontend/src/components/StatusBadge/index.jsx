import styles from './index.module.css';

const STATUS_CONFIG = {
  confirmado: { label: 'Confirmado', badge: styles.confirmado, dot: styles.dotConfirmado },
  cancelado:  { label: 'Cancelado',  badge: styles.cancelado,  dot: styles.dotCancelado },
  desmarcado: { label: 'Desmarcado', badge: styles.desmarcado, dot: styles.dotDesmarcado },
};

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.confirmado;
  return (
    <span className={`${styles.badge} ${cfg.badge}`}>
      <span className={`${styles.dot} ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default StatusBadge;