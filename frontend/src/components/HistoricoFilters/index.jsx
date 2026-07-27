import styles from './index.module.css';

const TODAS_SALAS = 'Todas as Salas';
const TODOS_TIPOS = 'Todos os Tipos';
const TODOS_PERIODOS = 'Todos os Períodos';

export function HistoricoFilters({
  busca,
  onBuscaChange,
  sala,
  onSalaChange,
  tipo,
  onTipoChange,
  periodo,
  onPeriodoChange,
  salasOptions,
  tiposOptions,
  periodosOptions,
  onLimpar
}) {
  const chips = [];
  if (sala !== TODAS_SALAS) {
    chips.push({ label: sala, onRemover: () => onSalaChange(TODAS_SALAS) });
  }
  if (tipo !== TODOS_TIPOS) {
    chips.push({ label: tipo, onRemover: () => onTipoChange(TODOS_TIPOS) });
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
            placeholder="Buscar agendamento..."
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
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4v18" />
            <path d="M19 21V11l-6-4" />
          </svg>
          <select
            value={sala}
            onChange={(e) => onSalaChange(e.target.value)}
            className={styles.select}
          >
            <option>{TODAS_SALAS}</option>
            {salasOptions.map((nome) => (
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
            <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          <select
            value={tipo}
            onChange={(e) => onTipoChange(e.target.value)}
            className={styles.select}
          >
            <option>{TODOS_TIPOS}</option>
            {tiposOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
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