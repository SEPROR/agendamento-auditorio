import React from 'react';
import styles from './index.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles['footer-top']}>
        <div className={styles['footer-info']}>
          <h3 className={styles['footer-title']}>Gestão e Desenvolvimento</h3>
          <div className={styles['footer-columns']}>
            <div className={styles['footer-column']}>
              <span className={styles['column-label']}>Desenvolvimento:</span>
              <span>Ana Paula Matos Damasceno</span>
              <span>Ingrid Gabrielly Medeiros</span>
            </div>
            <div className={styles['footer-column']}>
              <span className={styles['column-label']}>Suporte/Contato:</span>
              <span>@gmail</span>
            </div>
          </div>
          <div className={styles['footer-columns']}>
            <div className={styles['footer-column']}>
              <span className={styles['column-label']}>Supervisão:</span>
              <span>Wenceslau</span>
              <span>Renato</span>
              <span>Diego</span>
            </div>
          </div>
        </div>

        <div className={styles['footer-brand']}>
          <img
            src="/images/logo.png"
            alt="logo"
            className={styles['brand-logo']}
          />
          <div className={styles['brand-text']}>
            <span className={styles['brand-name']}>SEPROR</span>
            <span className={styles['brand-subtitle']}>SECRETARIA DE PRODUÇÃO RURAL</span>
          </div>
        </div>
      </div>

      <div className={styles.FooterBar}>
        <div className={styles.FooterBarContainer}>
          <span className={styles.copyright}>Copyright © 2026 By Sepror</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;