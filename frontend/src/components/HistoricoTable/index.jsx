import styles from './index.module.css';

function initials(nome) {
  if (!nome) return '';
  return nome.split(' ').slice(0, 2).map((x) => x[0]).join('').toUpperCase();
}

export function HistoricoTable({ estado, itens, tableCountLabel, onAbrirModal, onTentarNovamente }) {
  if (estado === 'loading') {
    return <div className={styles.emptyState}>Carregando histórico de agendamentos...</div>;
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
              <th>Sala</th>
              <th>Assunto</th>
              <th>Data</th>
              <th>Horário</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((a, i) => (
              <tr
                key={a.id}
                onClick={() => onAbrirModal(a.id)}
                style={i % 2 !== 0 ? { background: '#fbfcfd' } : undefined}
              >
                <td className={styles.tdId}>#{a.id}</td>
                <td style={{ fontWeight: 500 }}>{a.solicitante}</td>
                <td className={styles.tdMuted}>{a.setor}</td>
                <td>
                  <div className={styles.avatarCell}>
                    <div className={styles.avatar}>{initials(a.sala)}</div>
                    {a.sala}
                  </div>
                </td>
                <td className={`${styles.tdMuted} ${styles.tdTrunc}`} title={a.assunto}>{a.assunto}</td>
                <td className={styles.tdMuted} style={{ whiteSpace: 'nowrap' }}>{a.data}</td>
                <td className={styles.tdMuted} style={{ whiteSpace: 'nowrap' }}>
                  {a.horaInicio} – {a.horaFim}
                </td>
                <td className={`${styles.tdMuted} ${styles.tdTrunc}`} title={a.observacoes}>{a.observacoes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileCards}>
        {itens.map((a) => (
          <div key={a.id} className={styles.mobileCard} onClick={() => onAbrirModal(a.id)}>
            <div className={styles.mobileCardRow}>
              <div>
                <div className={styles.mobileCardId}>#{a.id}</div>
                <div className={styles.mobileCardName}>{a.solicitante}</div>
              </div>
            </div>
            <div className={styles.mobileCardMeta}>
              <strong>Sala:</strong> {a.sala}<br />
              <strong>Assunto:</strong> {a.assunto}<br />
              <strong>Data:</strong> {a.data} das {a.horaInicio} às {a.horaFim}<br />
              <strong>Observações:</strong> {a.observacoes}
            </div>
          </div>
        ))}
      </div>

      {itens.length === 0 && (
        <div className={styles.emptyState}>
          Nenhum agendamento encontrado para os filtros selecionados.
        </div>
      )}
    </>
  );
}

export default HistoricoTable;