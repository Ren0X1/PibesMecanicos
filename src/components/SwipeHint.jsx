import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { theme, FONT } from '../lib/theme.js'
import { useCanSwipe } from '../lib/useTouch.js'
import { t, useLang } from '../lib/i18n.js'
import { K } from '../lib/storageKeys.js'

const KEY = K.swipeHint

/* Aviso de una sola vez: un gesto que nadie te cuenta es un gesto
   que nadie usa. Se muestra al primer arranque táctil y no vuelve. */
export default function SwipeHint() {
  useLang()
  const canSwipe = useCanSwipe()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!canSwipe) return
    let seen = false
    try { seen = localStorage.getItem(KEY) === '1' } catch {}
    if (seen) return

    const appear = setTimeout(() => setShow(true), 900)
    const vanish = setTimeout(() => {
      setShow(false)
      try { localStorage.setItem(KEY, '1') } catch {}
    }, 5400)
    return () => { clearTimeout(appear); clearTimeout(vanish) }
  }, [canSwipe])

  if (!canSwipe || !show) return null

  return (
    <div
      onClick={() => { setShow(false); try { localStorage.setItem(KEY, '1') } catch {} }}
      style={{
        position: 'fixed', zIndex: 500, left: 14, right: 14,
        bottom: 'calc(env(safe-area-inset-bottom, 0) + 84px)',
        background: theme.card, border: `1px solid ${theme.rule}`,
        borderLeft: `3px solid ${theme.accent}`,
        padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11,
        animation: 'hintIn .28s ease-out',
      }}
    >
      <style>{`@keyframes hintIn { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform:none } }`}</style>
      <ChevronLeft size={15} color={theme.accent} />
      <span style={{
        flex: 1, textAlign: 'center', color: theme.text,
        fontFamily: FONT.mono, fontSize: 9, fontWeight: 500,
        letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>{t('swipe.hint')}</span>
      <ChevronRight size={15} color={theme.accent} />
    </div>
  )
}
