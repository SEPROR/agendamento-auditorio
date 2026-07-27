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

export function SolicitacaoModal({ solicitacao, onFechar, onExportarPDF }) {
  if (!solicitacao) return null;

  const campos = [
    ['Solicitante', solicitacao.solicitante],
    ['Setor', solicitacao.setor],
    ['Destino', solicitacao.destino],
    ['Motorista', solicitacao.motorista],
    ['Data de Saída', solicitacao.dataPartida],
    ['Hora de Saída', solicitacao.horaPartida],
    ['Aberta em', solicitacao.abertaEm],
    ['Encerrada em', solicitacao.fechadaEm]
  ];

  if (solicitacao.motoristaAnterior) {
    campos.push(['Redirecionada de', solicitacao.motoristaAnterior]);
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onFechar();
  };

  return (
    <div className={`${styles.modalOverlay} ${styles.open}`} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <div className={styles.overline}>Solicitação #{solicitacao.id}</div>
            <h2 className={styles.modalTitle}>{solicitacao.solicitante}</h2>
          </div>

          <button className={styles.modalClose} onClick={onFechar}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          <Badge status={solicitacao.status} />

          <div className={styles.modalGrid}>
            {campos.map(([label, valor]) => (
              <div key={label} className={styles.modalField}>
                <div className={styles.modalFieldLabel}>{label}</div>
                <div className={styles.modalFieldValue}>{valor}</div>
              </div>
            ))}
          </div>

          <div className={styles.kmBox}>
            <svg
              className={styles.kmIcon}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>

            <div>
              <div className={styles.kmLabel}>Ocorrência / Observações</div>
              <div className={styles.kmValue}>{solicitacao.ocorrencia}</div>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnOutline} onClick={() => onExportarPDF(solicitacao)}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar PDF
          </button>
          <button className={styles.btnPrimary} onClick={onFechar}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

export default SolicitacaoModal;
