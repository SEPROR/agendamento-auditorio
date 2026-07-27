import styles from './index.module.css';

export function Pagination({ paginaAtual, totalPaginas, total, pageSize, onIrPagina }) {
  const inicio = total > 0 ? (paginaAtual - 1) * pageSize + 1 : 0;
  const fim = Math.min(paginaAtual * pageSize, total);

  return (
    <div className={styles.pagination}>
      <span className={styles.info}>
        {total > 0 ? `Mostrando ${inicio}–${fim} de ${total}` : ''}
      </span>

      {totalPaginas > 1 && (
        <div className={styles.controls}>
          <button
            className={styles.btnIcon}
            onClick={() => onIrPagina(paginaAtual - 1)}
            disabled={paginaAtual === 1}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`${styles.pageBtn} ${n === paginaAtual ? styles.active : ''}`}
              onClick={() => onIrPagina(n)}
            >
              {n}
            </button>
          ))}

          <button
            className={styles.btnIcon}
            onClick={() => onIrPagina(paginaAtual + 1)}
            disabled={paginaAtual === totalPaginas}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default Pagination;
