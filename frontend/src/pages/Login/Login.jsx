import { useState } from 'react'
import styles from './index.module.css'

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className={styles.spinner} width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/login-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ usuario: username, senha: password }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Usuário ou senha inválidos.')
      }

      window.location.href = data.redirectTo || '/'
    } catch (err) {
      setError(err?.message ?? 'Não foi possível autenticar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>ACESSE PARA AGENDAR</p>
          <h1 className={styles.title}>Bem-vindo</h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Usuário */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">
              USUÁRIO
            </label>
            <input
              id="username"
              className={styles.input}
              type="text"
              placeholder="seu.usuario"
              autoComplete="username"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* Senha */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              SENHA
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                className={styles.input}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {/* Erro de autenticação */}
          {error && (
            <p className={styles.errorMessage} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || !username || !password}
          >
            {loading ? (
              <>
                <SpinnerIcon />
                Entrando…
              </>
            ) : (
              'ENTRAR'
            )}
          </button>
        </form>

        <p className={styles.footer}>© 2026 SEPROR. Todos os direitos reservados.</p>
      </div>
    </div>
  )
}