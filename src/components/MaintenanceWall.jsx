import { useState, useEffect } from 'react'
import { theme, css } from '../lib/theme.js'
import { t, useLang } from '../lib/i18n.js'
import Login from './Login.jsx'
import Footer from './Footer.jsx'

/* ─────────────────────────────────────────────────────────────
   La web apagada

   Mientras el modo mantenimiento está puesto, esto es lo único que
   se ve. No es una pantalla de error: no hay nada roto, es que
   alguien está trabajando dentro.

   Lleva una puerta pequeña para el administrador, porque si no la
   llevara no habría forma de volver a encender la web desde la
   propia web. Quien entre y no sea administrador vuelve aquí: la
   puerta está, pero solo abre para quien tiene que abrir.
   ───────────────────────────────────────────────────────────── */
export default function MaintenanceWall({ user, message, onLogin, onLogout }) {
  useLang()
  const [entrando, setEntrando] = useState(false)

  if (entrando && !user) {
    return <Login onLogin={onLogin} />
  }

  return (
    <div style={{
      minHeight: '100dvh', background: theme.bg, color: theme.text,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ borderTop: `2px solid ${theme.rule}`, paddingTop: 22 }}>
            <div style={{ fontSize: 34, lineHeight: 1, marginBottom: 14 }}>🔧</div>
            <h1 style={{ ...css.h1, marginBottom: 10 }}>{t('mmode.title')}</h1>

            {/* El aviso que haya escrito quien lo apagó; si no hay
                ninguno, el de siempre. */}
            <p style={{
              ...css.lbl, textTransform: 'none', letterSpacing: '0.02em',
              fontSize: 13, lineHeight: 1.5, color: theme.muted, margin: 0,
            }}>
              {message || t('mmode.body')}
            </p>

            {user && (
              <p style={{
                ...css.lbl, textTransform: 'none', letterSpacing: '0.02em',
                fontSize: 12, color: theme.yellow, margin: '18px 0 0',
                borderLeft: `2px solid ${theme.yellow}`, paddingLeft: 9,
              }}>
                {t('mmode.notAdmin')}
              </p>
            )}

            <div style={{ marginTop: 26, display: 'flex', gap: 8 }}>
              {user ? (
                <button onClick={onLogout} style={css.btnOutline}>{t('nav.logout')}</button>
              ) : (
                <button onClick={() => setEntrando(true)} style={css.btnOutline}>
                  {t('mmode.adminEntry')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

/* La tira que ve el administrador mientras la web está apagada.
   Lleva el atajo al panel, que es donde se apaga: si hay que
   buscarlo, alguien se deja la web caída toda la tarde. */
export function MaintenanceBanner({ stacked = false, onGoPanel }) {
  useLang()

  /* El garaje de escritorio calcula su alto con el viewport, así que
     necesita saber cuánto ocupan las tiras de arriba. */
  useEffect(() => {
    document.documentElement.style.setProperty('--pm-banner', stacked ? '76px' : '38px')
    return () => document.documentElement.style.removeProperty('--pm-banner')
  }, [stacked])

  return (
    <div style={{
      background: theme.yellowSoft, borderBottom: `1px solid ${theme.yellow}`,
      color: theme.yellow, padding: '9px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      flexWrap: 'wrap',
    }}>
      <span style={{ ...css.lbl, color: theme.yellow, letterSpacing: '0.08em', fontSize: 10.5 }}>
        {t('mmode.banner')}
      </span>
      <button onClick={onGoPanel} style={css.btnSm(theme.yellow, theme.bg)}>
        {t('mmode.turnOff')}
      </button>
    </div>
  )
}
