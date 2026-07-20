import React from 'react';
import { Link } from 'react-router-dom';
import styles from './index.module.css';

const Header = () => {
  return (
    <div id="container-header">
      <header className={styles.header}>
        <div className={styles.leftSection}>
          <Link to="/" className={styles.logoLink}>
            <img
              src="/images/logo-governo-am.png"
              alt="Governo do Estado do Amazonas"
              className={styles.logoGoverno}
            />
          </Link>

          <div className={styles.divider} />

          <div className={styles.brandBlock}>
            <span className={styles.brandName}>
              <span className={styles.brandThin}>Auditório</span>
              <span className={styles.brandBold}>Sepror</span>
            </span>
            {/* <span className={styles.brandSub}>AUDITÓRIO PRINCIPAL</span> */}
          </div>
        </div>

        {/* Lado direito: logo da secretaria */}
        <div className={styles.rightSection}>
          
            <img
              src="/images/secretaria.png"
              alt="Secretaria de Produção Rural"
              className={styles.logoSecretaria}
            />
        
        </div>
      </header>

      {/* Linha separadora sutil abaixo do header */}
      <div className={styles.headerBorder} />
    </div>
  );
};

export default Header; 