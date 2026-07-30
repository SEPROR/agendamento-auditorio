import { useState, useRef, useEffect } from "react";
import styles from "./index.module.css";

export default function Header() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.crest}>AM</div>
          <div className={styles.brandText}>
            <span className={styles.overline}>Governo do Estado do Amazonas</span>
            <span className={styles.name}>Secretaria de Produção Rural</span>
          </div>
        </div>

        <div className={styles.userMenu} ref={menuRef}>
          <button
            type="button"
            className={styles.userTrigger}
            data-open={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            <div className={styles.userAvatar}>U</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>Usuário</span>
              <span className={styles.userRole}>Administrador</span>
            </div>
            <svg
              className={styles.chevron}
              data-open={open}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {open && (
            <div className={styles.dropdown}>
              <a href="/" className={styles.dropdownItem}>
                Agendamento
              </a>
              <a href="/agendamentos/relatorio" className={styles.dropdownItem}>
                Relatório
              </a>
              <div className={styles.dropdownDivider} />
              <button
                type="button"
                className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}