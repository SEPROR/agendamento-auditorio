import styles from './index.module.css';

const TODOS_MOTORISTAS = 'Todos os Motoristas';
const TODOS_STATUS = 'Todos os Status';
const TODOS_PERIODOS = 'Todos os Períodos';

export function HistoricoFilters({
  busca,
  onBuscaChange,
  motorista,
  onMotoristaChange,
  status,
  onStatusChange,
  periodo,
  onPeriodoChange,
  motoristasOptions,
  periodosOptions,
  onLimpar
}) {
  const chips = [];
  if (motorista !== TODOS_MOTORISTAS) {
    chips.push({ label: motorista, onRemover: () => onMotoristaChange(TODOS_MOTORISTAS) });
  }
  if (status !== TODOS_STATUS) {
    chips.push({ label: status, onRemover: () => onStatusChange(TODOS_STATUS) });
  }
  if (periodo !== TODOS_PERIODOS) {
    const periodoOpt = periodosOptions.find((p) => p.chave === periodo);
    chips.push({
      label: periodoOpt ? periodoOpt.label : periodo,
      onRemover: () => onPeriodoChange(TODOS_PERIODOS)
    });
  }

  const temFiltroAtivo = chips.length > 0 || busca;

  return (
    <div className={styles.card}>
      <div className={styles.filtersHeader}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2196a6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span className={styles.filtersHeaderLabel}>Filtros</span>

        {temFiltroAtivo && (
          <button className={styles.btnGhost} onClick={onLimpar}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: 4 }}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Limpar filtros
          </button>
        )}
      </div>

      <div className={styles.filtersGrid}>
        <div className={styles.filterField}>
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar solicitação..."
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.filterField}>
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <select
            value={motorista}
            onChange={(e) => onMotoristaChange(e.target.value)}
            className={styles.select}
          >
            <option>{TODOS_MOTORISTAS}</option>
            {motoristasOptions.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
          <svg
            className={styles.chevron}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <div className={styles.filterField}>
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className={styles.select}
          >
            <option>{TODOS_STATUS}</option>
            <option value="fechado">Fechadas</option>
            <option value="em_andamento">Em andamento</option>
            <option value="aberto">Abertas</option>
          </select>
          <svg
            className={styles.chevron}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <div className={styles.filterField}>
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <select
            value={periodo}
            onChange={(e) => onPeriodoChange(e.target.value)}
            className={styles.select}
          >
            <option>{TODOS_PERIODOS}</option>
            {periodosOptions.map((p) => (
              <option key={p.chave} value={p.chave}>{p.label}</option>
            ))}
          </select>
          <svg
            className={styles.chevron}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {chips.length > 0 && (
        <div className={styles.chipsRow}>
          {chips.map((chip, i) => (
            <span key={i} className={styles.chip}>
              {chip.label}
              <button onClick={chip.onRemover}>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoricoFilters;
