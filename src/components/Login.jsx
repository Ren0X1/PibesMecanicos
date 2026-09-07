import { useState, useEffect } from 'react'
import { Eye, EyeOff, Lock, Wrench, FlaskConical, ArrowRight } from 'lucide-react'
import { theme, css, FONT } from '../lib/theme.js'
import { login, hasSupabaseConfig } from '../lib/api.js'
import { enterDemo } from '../lib/demo/mode.js'
import { t, useLang } from '../lib/i18n.js'
import { Field } from './ui.jsx'

function getLockout() {
  try {
    const raw = sessionStorage.getItem('pm_lockout')
    if (!raw) return { fails: 0, until: 0 }
    return JSON.parse(raw)
  } catch { return { fails: 0, until: 0 } }
}

function setLockout(data) {
  try { sessionStorage.setItem('pm_lockout', JSON.stringify(data)) } catch {}
}

function getTimeout(fails) {
  if (fails < 3) return 0
  if (fails === 3) return 30
  if (fails === 4) return 60
  return 300 // 5 min como máximo
}

export default function Login({ onLogin }) {
  useLang()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    const lock = getLockout()
    const remaining = Math.ceil((lock.until - Date.now()) / 1000)
    if (remaining > 0) setCountdown(remaining)
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleLogin = async () => {
    if (countdown > 0) return
    if (!username || !pin) return setError(t('login.errEmpty'))
    setLoading(true)
    setError('')
    try {
      const user = await login(username, pin)
      setLockout({ fails: 0, until: 0 })
      onLogin(user)
    } catch (err) {
      const lock = getLockout()
      const newFails = lock.fails + 1
      const timeout = getTimeout(newFails)
      const until = timeout > 0 ? Date.now() + timeout * 1000 : 0
      setLockout({ fails: newFails, until })
      if (timeout > 0) {
        setCountdown(timeout)
        setError(t('login.errTooMany', { time: timeout >= 60 ? `${Math.floor(timeout / 60)} min` : `${timeout} s` }))
      } else {
        setError(err.message || t('login.errCreds'))
      }
    } finally {
      setLoading(false)
    }
  }

  const locked = countdown > 0
  const formatCountdown = () => {
    const m = Math.floor(countdown / 60)
    const s = countdown % 60
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s} s`
  }

  return (
    <div style={{
      minHeight: '100vh', minHeight: '100dvh', background: theme.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Marca */}
        <div style={{ marginBottom: 26 }}>
          <div style={{
            width: 44, height: 44, display: 'grid', placeItems: 'center',
            background: theme.accent, color: theme.accentInk, marginBottom: 16,
          }}>
            <Wrench size={24} strokeWidth={2.2} />
          </div>
          <h1 style={{
            fontFamily: FONT.display, fontSize: 30, lineHeight: 0.95,
            letterSpacing: '-0.04em', textTransform: 'uppercase', color: theme.white,
          }}>Pibes<br />Mecánicos</h1>
          <p style={{ ...css.lbl, marginTop: 11 }}>{t('login.tagline')}</p>
        </div>

        {/* Formulario */}
        <div style={{
          borderTop: `2px solid ${theme.rule}`, paddingTop: 20,
        }}>
          <Field label={t('login.user')}>
            <input style={css.input} value={username} disabled={locked}
              autoCapitalize="none" autoCorrect="off"
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder={t('login.userPh')}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </Field>

          <Field label={t('login.pin')}>
            <div style={{ position: 'relative' }}>
              <input style={{ ...css.input, ...css.num, paddingRight: 40, letterSpacing: '0.3em' }}
                type={showPin ? 'text' : 'password'} inputMode="numeric" pattern="[0-9]*"
                autoComplete="one-time-code" value={pin} disabled={locked}
                onChange={e => { setPin(e.target.value.replace(/[^\d]/g, '')); setError('') }}
                placeholder="••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              <button onClick={() => setShowPin(!showPin)} tabIndex={-1}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: theme.mutedLight,
                  cursor: 'pointer', display: 'flex', padding: 5,
                }}>
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          {error && (
            <p style={{
              ...css.lbl, color: theme.red, letterSpacing: '0.06em',
              textTransform: 'none', fontSize: 11.5, margin: '0 0 12px',
              borderLeft: `2px solid ${theme.red}`, paddingLeft: 9,
            }}>{error}</p>
          )}

          {locked ? (
            <div style={{
              border: `1px solid ${theme.red}`, borderLeft: `3px solid ${theme.red}`,
              padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 11,
            }}>
              <Lock size={17} color={theme.red} />
              <span style={{ ...css.lbl, color: theme.red }}>
                {t('login.locked')} — {formatCountdown()}
              </span>
            </div>
          ) : (
            <button onClick={handleLogin} disabled={loading}
              style={{
                ...css.btn(), width: '100%', justifyContent: 'center',
                padding: '13px 16px', fontSize: 11, opacity: loading ? 0.7 : 1,
              }}>
              {loading ? t('login.entering') : t('login.enter')}
            </button>
          )}

          {!hasSupabaseConfig && (
            <p style={{
              ...css.lbl, color: theme.yellow, textTransform: 'none',
              letterSpacing: '0.02em', fontSize: 11.5, marginTop: 14,
              borderLeft: `2px solid ${theme.yellow}`, paddingLeft: 9,
            }}>
              {t('login.noDb')}
            </p>
          )}
        </div>

        {/* Acceso a la demo: sin cuenta y sin base de datos */}
        <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: 26, paddingTop: 18 }}>
          <p style={{
            ...css.lbl, textTransform: 'none', letterSpacing: '0.02em',
            fontSize: 12, color: theme.muted, marginBottom: 12, lineHeight: 1.55,
          }}>
            {t('login.demoBody')}
          </p>
          <button onClick={enterDemo} style={{
            ...css.btnOutline, width: '100%', justifyContent: 'center',
            padding: '12px 16px', color: theme.accent, borderColor: theme.accent,
          }}>
            <FlaskConical size={13} /> {t('login.demoBtn')} <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
