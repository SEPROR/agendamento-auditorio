import { useState, useEffect } from 'react';
import styles from './index.module.css';
import StatusBadge from '../StatusBadge';

export function SolicitacaoModal({
  solicitacao,
  onFechar,
  onExportarPDF,
  onDesmarcar,
  podeDesmarcar = false,
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [desmarcando, setDesmarcando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null); // { emailEnviado }

  // Reseta a caixa ao abrir/trocar de reserva
  useEffect(() => {
    setConfirmando(false);
    setErro(null);
    setSucesso(null);
  }, [solicitacao?.id]);

  if (!solicitacao) return null;

  const campos = [
    ['Solicitante', solicitacao.solicitante],
    ['Setor', solicitacao.setor],
    ['Sala', solicitacao.sala],
    ['Data', solicitacao.data],
    ['Horário', `${solicitacao.horaInicio} – ${solicitacao.horaFim}`],
  ];

  // Botão só para quem tem permissão e para reservas confirmadas
  const mostrarDesmarcar = podeDesmarcar && solicitacao.status === 'confirmado';

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onFechar();
  };

  async function handleDesmarcar() {
    setDesmarcando(true);
    setErro(null);
    try {
      const resp = await onDesmarcar(solicitacao);
      if (!resp?.ok) throw new Error(resp?.erro || 'Não foi possível desmarcar.');
      setSucesso({ emailEnviado: !!resp.emailEnviado });
    } catch (err) {
      setErro(err.message || 'Não foi possível desmarcar.');
    } finally {
      setDesmarcando(false);
    }
  }

  function handleOkSucesso() {
    setSucesso(null);
    setConfirmando(false);
    onFechar();
  }

  return (
    <div className={`${styles.modalOverlay} ${styles.open}`} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <div className={styles.overline}>Agendamento #{solicitacao.id}</div>
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
          <div className={styles.modalGrid}>
            {campos.map(([label, valor]) => (
              <div key={label} className={styles.modalField}>
                <div className={styles.modalFieldLabel}>{label}</div>
                <div className={styles.modalFieldValue}>{valor}</div>
              </div>
            ))}

            <div className={styles.modalField}>
              <div className={styles.modalFieldLabel}>Status</div>
              <div className={styles.modalFieldValue}>
                <StatusBadge status={solicitacao.status} />
              </div>
            </div>
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
              <div className={styles.kmLabel}>Observações</div>
              <div className={styles.kmValue}>{solicitacao.observacoes}</div>
            </div>
          </div>
        </div>


        <div className={styles.modalFooter}>
          {mostrarDesmarcar && (
            <button
              className={styles.btnDanger}
              onClick={() => {
                setErro(null);
                setConfirmando(true);
              }}
            >
              Desmarcar
            </button>
          )}

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

      {confirmando && (
        <div
          className={styles.confirmOverlay}
          onClick={(e) => {
            e.stopPropagation();
            if (!desmarcando && !sucesso && e.target === e.currentTarget) setConfirmando(false);
          }}
        >
          <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            {!sucesso ? (
              <>
                <h3 className={styles.confirmTitle}>Você tem certeza?</h3>
                <p className={styles.confirmText}>
                  Ao desmarcar, o horário de <strong>{solicitacao.data}</strong>, das{' '}
                  <strong>{solicitacao.horaInicio} às {solicitacao.horaFim}</strong> ({solicitacao.sala}),
                  ficará disponível para agendamento por outros setores. A reserva de{' '}
                  <strong>{solicitacao.solicitante}</strong> aparecerá como desmarcada para ele(a).
                  Esta ação não pode ser desfeita.
                </p>
                {erro && <p className={styles.confirmErro}>{erro}</p>}
                <div className={styles.confirmActions}>
                  <button
                    className={styles.btnOutline}
                    disabled={desmarcando}
                    onClick={() => setConfirmando(false)}
                  >
                    Voltar
                  </button>
                  <button className={styles.btnDanger} disabled={desmarcando} onClick={handleDesmarcar}>
                    {desmarcando ? 'Desmarcando...' : 'Sim, desmarcar'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className={styles.confirmTitle}>Reserva desmarcada</h3>
                <p className={styles.confirmText}>
                  {sucesso.emailEnviado
                    ? 'O usuário foi avisado por e-mail e o horário foi liberado.'
                    : 'O horário foi liberado, mas o usuário não tem e-mail cadastrado ou o envio falhou.'}
                </p>
                <div className={styles.confirmActions}>
                  <button className={styles.btnPrimary} onClick={handleOkSucesso}>
                    OK
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SolicitacaoModal;