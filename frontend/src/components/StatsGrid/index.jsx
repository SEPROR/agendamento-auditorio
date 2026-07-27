import styles from './index.module.css';

export function StatsGrid({ filtrados, totalGeral }) {
  const salasUnicas = new Set(
    filtrados.map((a) => a.sala).filter((s) => s && s !== '—')
  ).size;

  const setoresUnicos = new Set(
    filtrados.map((a) => a.setor).filter((s) => s && s !== '—')
  ).size;

  const items = [
    {
      label: 'Agendamentos',
      value: filtrados.length,
      sub: `de ${totalGeral} total`,
      color: styles.green
    },
    {
      label: 'Salas Utilizadas',
      value: salasUnicas,
      sub: 'no filtro atual',
      color: styles.amber
    },
    {
      label: 'Setores Atendidos',
      value: setoresUnicos,
      sub: 'no filtro atual',
      color: styles.red
    }
  ];

  return (
    <div className={styles.statsGrid}>
      {items.map((item, i) => (
        <div key={i} className={styles.statCard}>
          <div className={`${styles.statValue} ${item.color}`}>{item.value}</div>
          <div className={styles.statLabel}>{item.label}</div>
          <div className={styles.statSub}>{item.sub}</div>
        </div>
      ))}
    </div>
  );
}

export default StatsGrid;