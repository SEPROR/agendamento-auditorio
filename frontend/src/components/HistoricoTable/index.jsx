import styles from './index.module.css';

const BADGE_CLASSES = {
  fechado: styles.badgeGreen,
  em_andamento: styles.badgeYellow,
  aberto: styles.badgeRed
};

function Badge({ status }) {
  const cls = BADGE_CLASSES[status] || styles.badgeAmber;
  return <span className={`${styles.badge} ${cls}`}>{status}</span>;
}

function initials(nome) {
  if (!nome) return '';
  return nome.split(' ').slice(0, 2).map((x) => x[0]).join('').toUpperCase();
}

export function HistoricoTable({ estado, itens, tableCountLabel, onAbrirModal, onTentarNovamente }) {
  if (estado === 'loading') {
    return <div className={styles.emptyState}>Carregando histórico de solicitações...</div>;
  }

  if (estado === 'error') {
    return (
      <div className={styles.emptyState}>
        Não foi possível carregar o histórico. Verifique a conexão com o servidor.
        <br /><br />
        <button className={styles.btnOutline} onClick={onTentarNovamente}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.tableHeaderRow}>
        <span className={styles.tableCount}>{tableCountLabel}</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Solicitante</th>
              <th>Setor</th>
              <th>Destino</th>
              <th>Motorista</th>
              <th>Data de Saída</th>
              <th>Encerrada em</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((s, i) => (
              <tr
                key={s.id}
                onClick={() => onAbrirModal(s.id)}
                style={i % 2 !== 0 ? { background: '#fbfcfd' } : undefined}
              >
                <td className={styles.tdId}>#{s.id}</td>
                <td style={{ fontWeight: 500 }}>{s.solicitante}</td>
                <td className={styles.tdMuted}>{s.setor}</td>
                <td className={`${styles.tdMuted} ${styles.tdTrunc}`} title={s.destino}>{s.destino}</td>
                <td>
                  <div className={styles.avatarCell}>
                    <div className={styles.avatar}>{initials(s.motorista)}</div>
                    {s.motorista}
                  </div>
                </td>
                <td className={styles.tdMuted} style={{ whiteSpace: 'nowrap' }}>
                  {s.dataPartida} {s.horaPartida}
                </td>
                <td className={styles.tdMuted} style={{ whiteSpace: 'nowrap' }}>{s.fechadaEm}</td>
                <td><Badge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileCards}>
        {itens.map((s) => (
          <div key={s.id} className={styles.mobileCard} onClick={() => onAbrirModal(s.id)}>
            <div className={styles.mobileCardRow}>
              <div>
                <div className={styles.mobileCardId}>#{s.id}</div>
                <div className={styles.mobileCardName}>{s.solicitante}</div>
              </div>
              <Badge status={s.status} />
            </div>
            <div className={styles.mobileCardMeta}>
              <strong>Destino:</strong> {s.destino}<br />
              <strong>Motorista:</strong> {s.motorista}<br />
              <strong>Saída:</strong> {s.dataPartida} às {s.horaPartida}
            </div>
          </div>
        ))}
      </div>

      {itens.length === 0 && (
        <div className={styles.emptyState}>
          Nenhuma solicitação encontrada para os filtros selecionados.
        </div>
      )}
    </>
  );
}

export default HistoricoTable;
