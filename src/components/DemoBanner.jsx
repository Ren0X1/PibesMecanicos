import { useState } from 'react'
import { RotateCcw, X, FlaskConical } from 'lucide-react'
import { theme, css, FONT } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { resetDemo } from '../lib/api.js'
import { t, useLang } from '../lib/i18n.js'
import { exitDemo } from '../lib/demo/mode.js'

/* Franja permanente en modo demo. Deja claro que los datos son
   inventados y que nada de lo que se toque sale del navegador. */
export default function DemoBanner({ onReset }) {
  useLang()
  const mob = useIsMobile()
  const [busy, setBusy] = useState(false)

  const handleReset = () => {
    if (!confirm(t('demo.resetConfirm'))) return
    setBusy(true)
    resetDemo()
    onReset?.()
    setBusy(false)
  }

  return (
    <div style={{
      background: theme.accent, color: theme.accentInk,
      position: 'sticky', top: 0, zIndex: 120,
    }}>
      <div style={{
        ...css.container, maxWidth: 1120,
        display: 'flex', alignItems: 'center', gap: 10,
        minHeight: 34, padding: mob ? '5px 14px' : '5px 18px',
      }}>
        <FlaskConical size={13} strokeWidth={2.2} style={{ flexShrink: 0 }} />
        <span style={{
          fontFamily: FONT.mono, fontSize: 9, fontWeight: 600,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {mob ? t('demo.bannerShort') : t('demo.banner')}
        </span>

        <button onClick={handleReset} disabled={busy} title={t('demo.reset')}
          style={{
            background: 'transparent', border: `1px solid ${theme.accentInk}55`,
            color: theme.accentInk, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px',
            fontFamily: FONT.mono, fontSize: 8.5, fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase', flexShrink: 0,
          }}>
          <RotateCcw size={11} /> {mob ? '' : t('demo.reset')}
        </button>

        <button onClick={exitDemo} title={t('demo.exit')}
          style={{
            background: 'transparent', border: 'none', color: theme.accentInk,
            cursor: 'pointer', display: 'flex', padding: 3, flexShrink: 0,
          }}>
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
