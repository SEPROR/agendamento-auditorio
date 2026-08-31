import { useState, useEffect } from "react";
import styles from "./index.module.css";
import Header from "../../components/Header";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Só confirmado e cancelado — sem "pendente"
const STATUS_CONFIG = {
  confirmado: { label: "Confirmado", className: styles.statusConfirmado, dot: styles.dotConfirmado },
  cancelado:  { label: "Cancelado",  className: styles.statusCancelado,  dot: styles.dotCancelado  },
};

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.iconCyan}>
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 6h13" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.iconCyan}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RoomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.iconCyan}>
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 14.5V9h6v5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="6" y="4" width="4" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.iconCyan}>
      <path d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="5" cy="5" r="1" fill="currentColor" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.iconSecondary}>
      <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 5.5h6M5 8h6M5 10.5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.iconMuted}>
      <path d="M1.5 12c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M9.5 8.5c1.5.3 3 1.5 3 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M8 2.5a2.5 2.5 0 0 1 0 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

// Ícone simples para "responsável" (quem vai usar a sala, pode ser diferente de quem agendou)
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.iconCyan}>
      <circle cx="8" cy="5.5" r="2.8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// A API /api/agendamentos/minhas já devolve sala, assunto, capacidade e responsável
// resolvidos — só precisamos formatar data e aplicar o status padrão (confirmado).
function mapAgendamento(raw) {
  const dataObj = new Date(`${raw.data}T00:00:00`);

  return {
    id: raw.id,
    dia: dataObj.toLocaleDateString("pt-BR"),
    diaSemana: capitalize(dataObj.toLocaleDateString("pt-BR", { weekday: "long" })),
    hora: raw.hora_inicio,
    horaFim: raw.hora_fim,
    sala: raw.sala,
    capacidade: raw.capacidade ? `${raw.capacidade} pessoas` : "—",
    assunto: raw.assunto,
    responsavel: raw.responsavel,
    observacoes: raw.observacoes || "Nenhuma observação informada.",
    // Sem coluna de status no banco ainda: tudo que existe é tratado como confirmado.
    status: raw.status ?? "confirmado",
  };
}

export default function MeusAgendamentos() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      setErro(null);

      try {
        const res = await fetch(`${API_URL}/api/agendamentos/minhas`, {
          credentials: "include", // envia o cookie de sessão do login AD
        });

        if (res.status === 401) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        if (!res.ok) {
          throw new Error(`Erro ao carregar agendamentos: ${res.status}`);
        }

        const bruto = await res.json();
        setAgendamentos(bruto.map(mapAgendamento));
      } catch (err) {
        console.error("Erro ao buscar agendamentos:", err);
        setErro(err.message || "Não foi possível carregar seus agendamentos.");
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderLabel}>
            <span className={styles.pageHeaderLine} />
            <span className={styles.pageHeaderTag}>Agendamentos</span>
          </div>
          <h1 className={styles.pageTitle}>Meus Agendamentos</h1>
          <p className={styles.pageSubtitle}>Gerencie e acompanhe suas reservas de salas</p>
        </div>

        {loading && <p className={styles.stateMsg}>Carregando...</p>}
        {erro && <p className={styles.stateError}>{erro}</p>}

        {!loading && !erro && agendamentos.length === 0 && (
          <p className={styles.stateMsg}>Nenhum agendamento encontrado.</p>
        )}

        <div className={styles.list}>
          {agendamentos.map((ag) => {
            const status = STATUS_CONFIG[ag.status] ?? STATUS_CONFIG.confirmado;
            const isOpen = expandido === ag.id;

            return (
              <div
                key={ag.id}
                className={`${styles.card} ${isOpen ? styles.cardOpen : ""}`}
              >
                <button
                  className={styles.cardTrigger}
                  onClick={() => setExpandido(isOpen ? null : ag.id)}
                >
                  <div className={styles.cardInfo}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardDate}>
                        <CalendarIcon />
                        {ag.diaSemana}, {ag.dia}
                      </span>
                      <span className={styles.metaDot}>·</span>
                      <span className={`${styles.statusBadge} ${status.className}`}>
                        <span className={`${styles.statusDot} ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>
                    <p className={styles.cardAssunto}>{ag.assunto}</p>
                    <div className={styles.cardDetails}>
                      <span className={styles.cardDetail}>
                        <ClockIcon />
                        {ag.hora} – {ag.horaFim}
                      </span>
                      <span className={styles.cardDetail}>
                        <RoomIcon />
                        {ag.sala}
                      </span>
                  
                    </div>
                  </div>
                  <span
                    className={styles.chevron}
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>

                {isOpen && (
                  <div className={styles.expandedBody}>
                    <div className={styles.expandedGrid}>
                      <div className={styles.detailBox}>
                        <p className={styles.detailBoxLabel}>
                          <CalendarIcon /> Data e Horário
                        </p>
                        <p className={styles.detailSubLabel}>DIA</p>
                        <p className={styles.detailValue}>{ag.dia} — {ag.diaSemana}</p>
                        <p className={styles.detailSubLabel} style={{ marginTop: "8px" }}>HORÁRIO</p>
                        <p className={`${styles.detailValue} ${styles.mono}`}>{ag.hora} → {ag.horaFim}</p>
                      </div>

                      <div className={styles.detailBox}>
                        <p className={styles.detailBoxLabel}>
                          <RoomIcon /> Sala
                        </p>
                        <p className={styles.detailValue}>{ag.sala}</p>
                        <p className={styles.detailCapacidade}>
                          <PeopleIcon /> Capacidade: {ag.capacidade}
                        </p>
                      </div>

                      <div className={`${styles.detailBox} ${styles.colSpan2}`}>
                        <p className={styles.detailBoxLabel}>
                          <TagIcon /> Assunto / Finalidade
                        </p>
                        <p className={styles.detailValue}>{ag.assunto}</p>
                      </div>

                      <div className={`${styles.detailBoxObs} ${styles.colSpan2}`}>
                        <p className={styles.detailBoxLabelSecondary}>
                          <NoteIcon /> Observações
                        </p>
                        <p className={styles.obsText}>{ag.observacoes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}