import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import styles from './index.module.css'

function cn(...classes) {
  return classes
    .filter(Boolean)
    .flatMap((className) => className.split(' '))
    .map((className) => styles[className])
    .join(' ')
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (response.status === 401) {
    window.location.assign('/login')
    throw new Error('Sessão expirada.')
  }
  if (response.status === 403) {
    window.location.assign('/sem-acesso')
    throw new Error('Você não possui acesso a esta página.')
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.erro || 'Não foi possível concluir a ação.')
  return data
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export default function ListaUsuarios() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [busyLogin, setBusyLogin] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    api('/api/acessos/usuarios')
      .then(setUsers)
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false))
  }, [])

  // pesquisa no AD com atraso para não consultar a cada tecla
  useEffect(() => {
    const term = query.trim()
    if (term.length < 3) {
      setResults([])
      setSearching(false)
      return
    }
    let active = true
    setSearching(true)
    const timeout = window.setTimeout(async () => {
      try {
        const data = await api(`/api/acessos/ad?q=${encodeURIComponent(term)}`)
        if (active) {
          setResults(data)
          setMessage(null)
        }
      } catch (error) {
        if (active) setMessage(error.message)
      } finally {
        if (active) setSearching(false)
      }
    }, 350)
    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [query])

  const existing = useMemo(() => new Set(users.map((user) => user.login)), [users])

  async function addUser(login) {
    setBusyLogin(login)
    setMessage(null)
    try {
      await api('/api/acessos/usuarios', { method: 'POST', body: JSON.stringify({ login }) })
      // já abre a tela de permissões do usuário recém-adicionado
      navigate(`/agendamentos/controle/${login}`)
    } catch (error) {
      setMessage(error.message)
      setBusyLogin(null)
    }
  }

  async function removeUser(user) {
    if (!window.confirm(`Remover o acesso de ${user.nomeCompleto}?`)) return
    setBusyLogin(user.login)
    setMessage(null)
    try {
      await api(`/api/acessos/usuarios/${user.login}`, { method: 'DELETE' })
      setUsers((current) => current.filter((item) => item.login !== user.login))
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusyLogin(null)
    }
  }

  const showResults = query.trim().length >= 3

  return (
    <div>
      <Header />
      <main className={cn('page')}>
        <div className={cn('content-shell')}>
          <header className={cn('page-heading')}>
            <div>
              <p className={cn('eyebrow')}>ADMINISTRAÇÃO</p>
              <h1>Usuários com acesso</h1>
              <p className={cn('page-subtitle')}>
                Pesquise no Active Directory para dar acesso a um novo usuário ou ajuste quem já tem.
              </p>
            </div>
          </header>

          {message && (
            <div className={cn('alert')} role="alert">
              {message}
            </div>
          )}

          <section className={cn('panel search-panel')}>
            <label className={cn('search-label')} htmlFor="busca-ad">
              Adicionar usuário
            </label>
            <div className={cn('search-box')}>
              <input
                id="busca-ad"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite o nome, o login ou o e-mail"
                autoComplete="off"
              />
              {searching && <span className={cn('spinner')} aria-label="Pesquisando" />}
            </div>
            <p className={cn('hint')}>Digite pelo menos 3 letras.</p>

            {showResults && !searching && results.length === 0 && (
              <p className={cn('empty')}>Nenhum usuário encontrado no Active Directory para “{query.trim()}”.</p>
            )}

            {results.length > 0 && (
              <ul className={cn('result-list')}>
                {results.map((user) => {
                  const added = user.jaTemAcesso || existing.has(user.login)
                  return (
                    <li className={cn('row', !user.ativo && 'row-off')} key={user.login}>
                      <span className={cn('avatar')}>{initials(user.nomeCompleto)}</span>
                      <div className={cn('row-info')}>
                        <strong>{user.nomeCompleto}</strong>
                        <span>
                          {user.login}
                          {user.email ? ` · ${user.email}` : ''}
                        </span>
                      </div>
                      {!user.ativo ? (
                        <span className={cn('badge badge-off')}>Desativado no AD</span>
                      ) : added ? (
                        <button
                          type="button"
                          className={cn('btn btn-ghost')}
                          onClick={() => navigate(`/agendamentos/controle/${user.login}`)}
                        >
                          Configurar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={cn('btn btn-primary')}
                          disabled={busyLogin === user.login}
                          onClick={() => addUser(user.login)}
                        >
                          {busyLogin === user.login ? 'Adicionando...' : 'Adicionar'}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className={cn('panel list-panel')}>
            <div className={cn('list-heading')}>
              <h2>Quem tem acesso</h2>
              <span className={cn('count')}>{users.length}</span>
            </div>

            {loading ? (
              <p className={cn('empty')}>Carregando usuários...</p>
            ) : users.length === 0 ? (
              <p className={cn('empty')}>Ninguém foi adicionado ainda. Use a pesquisa acima para começar.</p>
            ) : (
              <ul className={cn('result-list')}>
                {users.map((user) => (
                  <li className={cn('row')} key={user.login}>
                    <span className={cn('avatar')}>{initials(user.nomeCompleto)}</span>
                    <div className={cn('row-info')}>
                      <strong>{user.nomeCompleto}</strong>
                      <span>
                        {user.login}
                        {user.email ? ` · ${user.email}` : ''}
                      </span>
                    </div>
                    <span className={cn('badge', user.perfil === 'SUPER-ADMIN' ? 'badge-super' : 'badge-admin')}>
                      {user.perfil}
                    </span>
                    <span className={cn('perm-count')}>{user.totalPermissoes} permissões</span>
                    <button
                      type="button"
                      className={cn('btn btn-ghost')}
                      onClick={() => navigate(`/agendamentos/controle/${user.login}`)}
                    >
                      Configurar
                    </button>
                    <button
                      type="button"
                      className={cn('btn btn-danger')}
                      disabled={busyLogin === user.login}
                      onClick={() => removeUser(user)}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}