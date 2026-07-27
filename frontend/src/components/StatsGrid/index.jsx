import styles from './index.module.css';

export function StatsGrid({ filtrados, totalGeral }) {
  const motoristasUnicos = new Set(
    filtrados.map((s) => s.motorista).filter((m) => m && m !== '—')
  ).size;

  const setoresUnicos = new Set(
    filtrados.map((s) => s.setor).filter((s) => s && s !== '—')
  ).size;

  const items = [
    {
      label: filtrados[0]?.status || 'Status',
      value: filtrados.length,
      sub: `de ${totalGeral} total`,
      color: styles.green
    },
    {
      label: 'Motoristas Envolvidos',
      value: motoristasUnicos,
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