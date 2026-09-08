import { useState, useEffect } from 'react'
import { RotateCcw, LogOut, FlaskConical } from 'lucide-react'
import { theme, css, FONT } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { resetDemo } from '../lib/api.js'
import { t, useLang } from '../lib/i18n.js'
import { exitDemo } from '../lib/demo/mode.js'

/* Franja permanente en modo demo. Deja claro que los datos son
   inventados y que nada de lo que se toque sale del navegador.

   Los dos botones van con texto, no solo con icono: una ✕ suelta
   sobre una franja de color se lee como «cerrar el aviso», no como
   «salir de la demo», y quien quiere irse no la encuentra. */
export default function DemoBanner({ onReset }) {
  useLang()
  const mob = useIsMobile()
  const [busy, setBusy] = useState(false)

  /* El garaje de escritorio calcula su alto con el viewport, así que
     necesita saber cuánto ocupa esta franja. */
  useEffect(() => {
    document.documentElement.style.setProperty('--pm-banner', '38px')
    return () => document.documentElement.style.removeProperty('--pm-banner')
  }, [])

  const handleReset = () => {
    if (!confirm(t('demo.resetConfirm'))) return
    setBusy(true)
    resetDemo()
    onReset?.()
    setBusy(false)
  }

  const handleExit = () => {
    if (!confirm(t('demo.exitConfirm'))) return
    exitDemo()
  }

  const btn = {
    background: 'transparent',
    border: `1px solid ${theme.accentInk}55`,
    color: theme.accentInk,
    cursor: 'pointer', flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 9px', minHeight: 26,
    fontFamily: FONT.mono, fontSize: 8.5, fontWeight: 600,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{
      background: theme.accent, color: theme.accentInk,
      position: 'sticky', top: 0, zIndex: 120,
    }}>
      <div style={{
        ...css.container, maxWidth: 1120,
        display: 'flex', alignItems: 'center', gap: 10,
        minHeight: 38, padding: mob ? '6px 14px' : '6px 18px',
      }}>
        <FlaskConical size={13} strokeWidth={2.2} style={{ flexShrink: 0 }} />

        <span style={{
          fontFamily: FONT.mono, fontSize: 9, fontWeight: 600,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {mob ? t('demo.bannerShort') : t('demo.banner')}
        </span>

        <button onClick={handleReset} disabled={busy} title={t('demo.resetConfirm')} style={btn}>
          <RotateCcw size={11} /> {t('demo.reset')}
        </button>

        {/* Salir: fondo macizo para que se distinga del de reiniciar */}
        <button
          onClick={handleExit}
          title={t('demo.exit')}
          style={{
            ...btn,
            background: theme.accentInk,
            color: theme.accent,
            border: `1px solid ${theme.accentInk}`,
          }}
        >
          <LogOut size={11} /> {mob ? t('demo.exitShort') : t('demo.exit')}
        </button>
      </div>
    </div>
  )
}
