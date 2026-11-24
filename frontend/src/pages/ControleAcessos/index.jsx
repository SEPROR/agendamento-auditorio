import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

const API = {
  permissions: '/api/acessos/permissoes',
  user: (login) => `/api/acessos/usuarios/${encodeURIComponent(login)}`,
}

const LIST_PATH = '/agendamentos/usuarios'

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5m6 6-6-6 6-6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

function Spinner() {
  return <span className={cn('spinner')} aria-hidden="true" />
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (response.status === 401) {
    window.location.assign('/')
    throw new Error('Sessão expirada.')
  }
  if (response.status === 403) {
    window.location.assign('/sem-acesso')
    throw new Error('Você não possui acesso a esta página.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.erro || 'Não foi possível concluir a ação.')
  return data
}

export default function ControleAcessos() {
  const { login } = useParams()
  const navigate = useNavigate()

  const [permissions, setPermissions] = useState([])
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState('ADMIN')
  const [selected, setSelected] = useState(new Set())
  const [initialProfile, setInitialProfile] = useState('ADMIN')
  const [initialSelected, setInitialSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(null)

    Promise.all([api(API.permissions), api(API.user(login))])
      .then(([permissionData, userData]) => {
        if (!active) return
        const userPermissions = new Set(userData.permissoes)
        setPermissions(permissionData)
        setUser(userData)
        setProfile(userData.perfil)
        setSelected(userPermissions)
        setInitialProfile(userData.perfil)
        setInitialSelected(new Set(userPermissions))
      })
      .catch((error) => {
        if (active) setLoadError(error.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [login])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const changed = useMemo(() => {
    if (profile !== initialProfile || selected.size !== initialSelected.size) return true
    return [...selected].some((code) => !initialSelected.has(code))
  }, [profile, selected, initialProfile, initialSelected])

  function changeProfile(nextProfile) {
    setProfile(nextProfile)
    setSelected(
      new Set(
        nextProfile === 'SUPER-ADMIN'
          ? permissions.map((permission) => permission.codigo)
          : permissions
              .filter((permission) => permission.padraoAdmin)
              .map((permission) => permission.codigo),
      ),
    )
  }

  function togglePermission(code) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  async function save() {
    if (!changed || saving) return
    setSaving(true)
    setToast(null)

    try {
      await api(API.user(login), {
        method: 'PUT',
        body: JSON.stringify({ perfil: profile, permissoes: [...selected] }),
      })

      setInitialProfile(profile)
      setInitialSelected(new Set(selected))
      setToast({ type: 'success', message: 'Alterações salvas com sucesso.' })
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível salvar as alterações.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className={cn('page loading-page')}>
        <Spinner />
        <p>Carregando configurações...</p>
      </main>
    )
  }

  if (loadError || !user) {
    return (
      <main className={cn('page loading-page')}>
        <p>{loadError || 'Não foi possível carregar este usuário.'}</p>
        <button className={cn('back-button')} type="button" onClick={() => navigate(LIST_PATH)}>
          <ArrowLeftIcon />
          Voltar
        </button>
      </main>
    )
  }

  return (
    <div>
      <Header />

      <main className={cn('page')}>
        {toast && (
          <div className={cn('toast', `toast-${toast.type}`)} role="status">
            <span className={cn('toast-icon')}>
              <CheckIcon />
            </span>
            <div>
              <strong>{toast.type === 'success' ? 'Tudo certo!' : 'Ocorreu um erro'}</strong>
              <p>{toast.message}</p>
            </div>
            <button type="button" onClick={() => setToast(null)} aria-label="Fechar aviso">
              ×
            </button>
          </div>
        )}

        <div className={cn('content-shell')}>
          <header className={cn('page-heading')}>
            <div>
              <p className={cn('eyebrow')}>ADMINISTRAÇÃO</p>
              <h1>Controle de Usuário</h1>
              <p className={cn('page-subtitle')}>
                Gerencie o perfil e as permissões individuais deste usuário
              </p>
            </div>
            <button className={cn('back-button')} type="button" onClick={() => navigate(LIST_PATH)}>
              <ArrowLeftIcon />
              Voltar
            </button>
          </header>

          <div className={cn('settings-layout')}>
            <aside className={cn('settings-sidebar')}>
              <section className={cn('panel user-panel')}>
                <div className={cn('user-identity')}>
                  <span className={cn('avatar')}>
                    {user.nomeCompleto
                      .split(' ')
                      .slice(0, 2)
                      .map((name) => name[0])
                      .join('')}
                  </span>
                  <div>
                    <span className={cn('status', user.ativo ? 'active' : 'inactive')}>
                      <i />
                      {user.ativo ? 'ATIVO' : 'INATIVO'}
                    </span>
                    <h2>{user.nomeCompleto}</h2>
                    <p>Informações do Active Directory</p>
                  </div>
                </div>
                <div className={cn('user-grid')}>
                  <Info label="Usuário" value={user.login} />
                  <Info label="E-mail" value={user.email || 'Não informado'} muted={!user.email} />
                </div>
              </section>

              <section className={cn('panel profile-panel')}>
                <div className={cn('section-heading')}>
                  <span className={cn('section-kicker')}>Nível de acesso</span>
                  <h2>Perfil principal</h2>
                  <p>Escolha o nível de atuação deste usuário.</p>
                </div>
                <div className={cn('profile-grid')}>
                  <ProfileCard
                    name="ADMIN"
                    description="Acesso operacional conforme as permissões selecionadas."
                    selected={profile === 'ADMIN'}
                    onSelect={() => changeProfile('ADMIN')}
                  />
                  <ProfileCard
                    name="SUPER-ADMIN"
                    description="Acesso administrativo com todas as permissões."
                    selected={profile === 'SUPER-ADMIN'}
                    onSelect={() => changeProfile('SUPER-ADMIN')}
                  />
                </div>
              </section>
            </aside>

            <section className={cn('panel permissions-panel')}>
              <div className={cn('permissions-heading')}>
                <div className={cn('section-heading')}>
                  <span className={cn('section-kicker')}>Acesso detalhado</span>
                  <h2>Permissões de acesso</h2>
                </div>
                <div className={cn('permission-counter')}>
                  <strong>{selected.size}</strong>
                  <span>de {permissions.length} ativas</span>
                </div>
              </div>

              <div className={cn('permission-list')}>
                {permissions.map((permission) => {
                  const checked = selected.has(permission.codigo)
                  return (
                    <label
                      className={cn(
                        'permission-card',
                        permission.padraoAdmin && 'technical',
                        checked && 'checked',
                      )}
                      key={permission.codigo}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(permission.codigo)}
                      />
                      <span className={cn('custom-checkbox')}>
                        <CheckIcon />
                      </span>
                      <span className={cn('permission-copy')}>
                        <span className={cn('permission-title')}>
                          <strong>{permission.nome}</strong>
                        </span>
                        <span className={cn('permission-description')}>{permission.descricao}</span>
                        <code>{permission.codigo}</code>
                      </span>
                    </label>
                  )
                })}
              </div>
            </section>
          </div>

          <footer className={cn('save-footer')}>
            <p>
              {changed
                ? 'Você possui alterações que ainda não foram salvas.'
                : 'Todas as configurações estão atualizadas.'}
            </p>
            <button type="button" disabled={!changed || saving} onClick={save}>
              {saving ? (
                <>
                  <Spinner /> Salvando...
                </>
              ) : (
                'Salvar alterações'
              )}
            </button>
          </footer>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function Info({ label, value, muted = false }) {
  return (
    <div className={cn('info-block')}>
      <span>{label}</span>
      <strong className={cn(muted && 'muted')}>{value}</strong>
    </div>
  )
}

function ProfileCard({ name, description, selected, onSelect }) {
  return (
    <label className={cn('profile-card', selected && 'selected')}>
      <input type="radio" name="profile" checked={selected} onChange={onSelect} />
      <span className={cn('radio-dot')} />
      <span>
        <strong>{name}</strong>
        <small>{description}</small>
      </span>
    </label>
  )
}