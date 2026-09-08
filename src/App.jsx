import { useState, useCallback, useEffect } from 'react'
import { theme, css, getThemeMode, setThemeMode, onThemeChange } from './lib/theme.js'
import { useIsMobile } from './lib/useIsMobile.js'
import { updateProfile, getDemoUser } from './lib/api.js'
import { isDemo, onDemoChange, exitDemo } from './lib/demo/mode.js'
import { t, useLang, onLangChange } from './lib/i18n.js'
import { needsOnboarding, adoptProfilePrefs } from './lib/prefs.js'
import { Onboarding, SettingsModal } from './components/Preferences.jsx'
import { Toast, Modal, Field } from './components/ui.jsx'
import Login from './components/Login.jsx'
import Nav from './components/Nav.jsx'
import DemoBanner from './components/DemoBanner.jsx'
import SwipeArea from './components/SwipeArea.jsx'
import SwipeHint from './components/SwipeHint.jsx'
import Footer from './components/Footer.jsx'
import Dashboard from './components/Dashboard.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import Workshops from './components/Workshops.jsx'
import Groups from './components/Groups.jsx'
import UserStats from './components/UserStats.jsx'
import Reminders from './components/Reminders.jsx'

function PinChangeModal({ user, onDone }) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (pin.length < 4) return setError(t('pin.errShort'))
    if (pin !== confirm) return setError(t('pin.errMatch'))
    setSaving(true)
    try {
      await updateProfile(user.id, { pin, pin_change_required: false })
      onDone({ ...user, pin, pin_change_required: false })
    } catch (err) { setError('Error: ' + err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: theme.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ borderTop: `2px solid ${theme.rule}`, paddingTop: 20 }}>
          <h2 style={{ ...css.h1, marginBottom: 8 }}>{t('pin.title')}</h2>
          <p style={{ ...css.lbl, textTransform: 'none', letterSpacing: '0.02em', fontSize: 12.5, marginBottom: 22 }}>
            {t('pin.intro')}
          </p>
          <Field label={t('pin.new')}>
            <input style={{ ...css.input, ...css.num, letterSpacing: '0.3em' }}
              inputMode="numeric" pattern="[0-9]*" type="password" value={pin}
              onChange={e => { setPin(e.target.value.replace(/[^\d]/g, '')); setError('') }}
              placeholder={t('pin.min')} />
          </Field>
          <Field label={t('pin.confirm')}>
            <input style={{ ...css.input, ...css.num, letterSpacing: '0.3em' }}
              inputMode="numeric" pattern="[0-9]*" type="password" value={confirm}
              onChange={e => { setConfirm(e.target.value.replace(/[^\d]/g, '')); setError('') }}
              placeholder={t('pin.repeat')}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </Field>
          {error && (
            <p style={{
              ...css.lbl, color: theme.red, textTransform: 'none',
              letterSpacing: '0.02em', fontSize: 11.5, margin: '0 0 12px',
              borderLeft: `2px solid ${theme.red}`, paddingLeft: 9,
            }}>{error}</p>
          )}
          <button onClick={handleSave} disabled={saving} style={{
            ...css.btn(), width: '100%', justifyContent: 'center', padding: '13px 16px', fontSize: 11,
            opacity: saving ? 0.7 : 1,
          }}>{saving ? t('common.saving') : t('pin.saveBtn')}</button>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  )
}

export default function App() {
  const [demo, setDemo] = useState(isDemo())
  const [currentUser, setCurrentUser] = useState(() => {
    if (isDemo()) return getDemoUser()
    try { const s = sessionStorage.getItem('pm_user'); return s ? JSON.parse(s) : null } catch { return null }
  })
  const [view, setView] = useState('dashboard')
  const [toast, setToast] = useState(null)
  const [dataVersion, setDataVersion] = useState(0)
  const [themeKey, setThemeKey] = useState(0)
  const [resetKey, setResetKey] = useState(0)  // solo se toca al reiniciar o cambiar de modo
  const [showSettings, setShowSettings] = useState(false)
  const isMobile = useIsMobile()
  useLang()

  /* El tema y el acento viven fuera de React: hay que repintar a mano. */
  useEffect(() => onThemeChange(() => setThemeKey(k => k + 1)), [])

  /* En la demo, cambiar de idioma regenera los datos de ejemplo, así
     que hay que volver a montar las vistas para que los recarguen. */
  useEffect(() => onLangChange(() => {
    if (isDemo()) { setCurrentUser(getDemoUser()); setResetKey(k => k + 1) }
  }), [])

  /* Lo que diga el perfil manda sobre lo guardado en el navegador. */
  useEffect(() => { adoptProfilePrefs(currentUser) }, [currentUser?.id])

  /* Entrar o salir de /demo cambia el usuario sin recargar la página. */
  useEffect(() => onDemoChange((on) => {
    setDemo(on)
    setView('dashboard')
    setCurrentUser(on ? getDemoUser() : null)
    setResetKey(k => k + 1)
  }), [])

  const handleLogin = (user) => {
    setCurrentUser(user); setView('dashboard')
    if (!isDemo()) {
      try { sessionStorage.setItem('pm_user', JSON.stringify(user)) } catch {}
    }
  }

  const handleLogout = () => {
    /* En la demo no hay sesión que cerrar: «salir» significa salir
       de la demo. Si no, se quedaría en /demo sin usuario, que es un
       estado que no lleva a ninguna parte. */
    if (isDemo()) { exitDemo(); return }
    setCurrentUser(null); setView('dashboard')
    try { sessionStorage.removeItem('pm_user') } catch {}
  }

  const onToast = useCallback((message, type = 'success') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3500)
    if (type === 'success') setDataVersion(v => v + 1)
  }, [])

  const toggleTheme = () => {
    setThemeMode(getThemeMode() === 'dark' ? 'light' : 'dark')
    setThemeKey(k => k + 1) // fuerza el repintado completo
  }

  /* El mismo orden que la barra inferior: deslizar equivale a pulsar
     la pestaña de al lado. */
  const views = ['dashboard', 'stats', 'reminders', 'groups', 'workshops',
    ...(currentUser?.role === 'admin' ? ['admin'] : [])]
  const viewIndex = Math.max(0, views.indexOf(view))

  if (!currentUser) return <Login onLogin={handleLogin} />

  if (needsOnboarding(currentUser)) {
    return <Onboarding user={currentUser} onDone={(updated, ok) => {
      setCurrentUser(updated)
      if (!isDemo()) { try { sessionStorage.setItem('pm_user', JSON.stringify(updated)) } catch {} }
      onToast(ok ? t('onb.saved') : t('set.savedLocal'), ok ? 'success' : 'error')
    }} />
  }

  if (currentUser.pin_change_required) {
    return <PinChangeModal user={currentUser} onDone={(updated) => {
      setCurrentUser(updated)
      try { sessionStorage.setItem('pm_user', JSON.stringify(updated)) } catch {}
    }} />
  }

  return (
    <div key={themeKey} style={{
      minHeight: '100dvh', background: theme.bg, color: theme.text, fontSize: 14,
      display: 'flex', flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0) + 72px)' : 0,
    }}>
      {demo && (
        <DemoBanner onReset={() => {
          setCurrentUser(getDemoUser())
          setView('dashboard')
          setResetKey(k => k + 1)
          onToast(t('demo.resetDone'))
        }} />
      )}
      <Nav user={currentUser} view={view} setView={setView} onLogout={handleLogout}
        dataVersion={dataVersion} onToggleTheme={toggleTheme}
        onOpenSettings={() => setShowSettings(true)} />
      <SwipeArea index={viewIndex} count={views.length} onChange={i => setView(views[i])}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div key={resetKey} style={{ flex: 1 }}>
          {view === 'dashboard' && <Dashboard user={currentUser} onToast={onToast} />}
          {view === 'stats' && <UserStats user={currentUser} onToast={onToast} />}
          {view === 'reminders' && <Reminders user={currentUser} onToast={onToast} />}
          {view === 'groups' && <Groups user={currentUser} onToast={onToast} />}
          {view === 'workshops' && <Workshops user={currentUser} onToast={onToast} />}
          {view === 'admin' && currentUser.role === 'admin' && <AdminPanel onToast={onToast} />}
        </div>
      </SwipeArea>
      <Footer />
      <SwipeHint />
      <SettingsModal
        open={showSettings}
        user={currentUser}
        onClose={() => setShowSettings(false)}
        onSaved={(updated) => {
          setCurrentUser(updated)
          if (!isDemo()) { try { sessionStorage.setItem('pm_user', JSON.stringify(updated)) } catch {} }
        }}
        onToast={onToast}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
