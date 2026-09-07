import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertTriangle, X } from 'lucide-react'
import { theme, css, FONT } from '../lib/theme.js'

/* ── Cabecera de sección ──────────────────────────────────────
   Filete grueso arriba, titular en Archivo Black y metadato en
   versalitas. Sin numeración. */
export function SectionHead({ title, sub, action, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
      borderTop: `2px solid ${theme.rule}`, paddingTop: 11, marginBottom: 14,
      ...style,
    }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={css.h1}>{title}</h1>
        {sub && <div style={css.subtitle}>{sub}</div>}
      </div>
      {action}
    </div>
  )
}

/* ── Etiqueta menor, con filete que ocupa el resto de la línea ── */
export function Label({ children, right, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      borderTop: `1px solid ${theme.border}`, paddingTop: 9, marginBottom: 9,
      ...css.lbl, ...style,
    }}>
      <span style={{ whiteSpace: 'nowrap' }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: theme.border }} />
      {right != null && <span style={{ color: theme.accent, fontWeight: 600 }}>{right}</span>}
    </div>
  )
}

/* ── Indicador de arco: la firma del sistema ──────────────────
   Arco de 300° que resume el estado del vehículo de 0 a 100. */
export function Gauge({ value = 0, color, size = 38, bg }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const c = color || theme.green
  const sweep = v * 0.83   // 83 % de la circunferencia = 300°
  return (
    <div style={{
      position: 'relative', width: size, height: size,
      display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', inset: 1, borderRadius: '50%',
        background: `conic-gradient(from 210deg, ${c} 0 ${sweep}%, ${theme.border} ${sweep}% 83%, transparent 83% 100%)`,
      }} />
      <div style={{
        position: 'absolute', inset: Math.max(3, Math.round(size * 0.105)),
        borderRadius: '50%', background: bg || theme.card,
      }} />
      <span style={{
        position: 'relative', ...css.num,
        fontSize: Math.round(size * 0.29), fontWeight: 600, color: theme.white,
      }}>{v}</span>
    </div>
  )
}

export function StatusBadge({ status }) {
  if (status === 'ok') return <span style={css.badge(theme.greenSoft, theme.green)}><CheckCircle size={11} /> OK</span>
  if (status === 'warn') return <span style={css.badge(theme.yellowSoft, theme.yellow)}><Clock size={11} /> Próximo</span>
  return <span style={css.badge(theme.redSoft, theme.red)}><AlertTriangle size={11} /> Vencido</span>
}

export function Modal({ open, onClose, title, children }) {
  /* Mientras haya un modal abierto los gestos de deslizamiento se
     inhiben: si no, arrastrar dentro del modal cambiaría de sección. */
  useEffect(() => {
    if (!open) return
    document.body.dataset.modalOpen = '1'
    return () => { delete document.body.dataset.modalOpen }
  }, [open])

  if (!open) return null
  const isMobile = window.innerWidth < 640
  return (
    <div style={css.overlay} onClick={onClose}>
      <div
        style={{
          ...css.modal,
          ...(isMobile ? { maxWidth: '100%', maxHeight: '94vh', margin: 8, padding: 16 } : {}),
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          ...css.flexBetween, marginBottom: 16,
          borderBottom: `2px solid ${theme.rule}`, paddingBottom: 11,
        }}>
          <h3 style={{ ...css.h2, fontSize: isMobile ? 16 : 18 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.muted, cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ResponsiveGrid2({ children }) {
  const isMobile = window.innerWidth < 640
  return <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>{children}</div>
}

export function Field({ label, children }) {
  return <div style={{ marginBottom: 13 }}><label style={css.label}>{label}</label>{children}</div>
}

/* ── Indicador agregado ──────────────────────────────────────
   Sin recuadro de icono de color: etiqueta arriba, cifra grande
   monoespaciada debajo. */
export function Stat({ icon, label, value, sub, color }) {
  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`,
      padding: '11px 12px', minWidth: 0,
    }}>
      <div style={{ ...css.lbl, letterSpacing: '0.17em', display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </div>
      <div style={{
        ...css.num, fontSize: 20, fontWeight: 600, marginTop: 6,
        color: color || theme.white, lineHeight: 1,
      }}>{value}</div>
      {sub && <div style={{ ...css.lbl, fontSize: 8.5, letterSpacing: '0.05em', marginTop: 5, textTransform: 'none' }}>{sub}</div>}
    </div>
  )
}

export function Loader({ text = 'Cargando' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 70 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 30, height: 30, margin: '0 auto 14px',
          border: `2px solid ${theme.border}`, borderTop: `2px solid ${theme.accent}`,
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={css.lbl}>{text}</p>
      </div>
    </div>
  )
}

export function Toast({ message, type = 'success', onClose }) {
  if (!message) return null
  const color = type === 'error' ? theme.red : theme.green
  const isMobile = window.innerWidth < 640
  return (
    <div style={{
      position: 'fixed', zIndex: 2000,
      bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0) + 74px)' : 24,
      ...(isMobile ? { left: 14, right: 14 } : { right: 24 }),
      background: theme.card, border: `1px solid ${color}`,
      borderLeft: `3px solid ${color}`,
      padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 13, color: theme.text, flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.muted, cursor: 'pointer', display: 'flex' }}>
        <X size={14} />
      </button>
    </div>
  )
}

export function DateInput({ value, onChange, style: s, ...props }) {
  const toDisplay = (iso) => {
    if (!iso) return ''
    const p = iso.split('-')
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ''
  }
  const [text, setText] = useState(toDisplay(value))

  useEffect(() => { setText(toDisplay(value)) }, [value])

  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^\d]/g, '')
    if (raw.length > 8) raw = raw.slice(0, 8)
    let display = raw
    if (raw.length > 2) display = raw.slice(0, 2) + '/' + raw.slice(2)
    if (raw.length > 4) display = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4)
    setText(display)
    if (raw.length === 8) {
      const iso = `${raw.slice(4)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}`
      onChange({ target: { value: iso } })
    } else if (raw.length === 0) {
      onChange({ target: { value: '' } })
    }
  }

  return <input type="text" inputMode="numeric" pattern="[0-9/]*" placeholder="DD/MM/AAAA"
    value={text} onChange={handleChange} style={{ ...css.input, ...css.num, ...s }} {...props} />
}

export function NumInput({ value, onChange, step, decimal, style: s, ...props }) {
  const [text, setText] = useState(value != null && value !== 0 ? String(value) : '')

  const isDecimal = decimal || (step && parseFloat(step) < 1)

  useEffect(() => {
    // No pisar lo que el usuario está tecleando si ya equivale al valor
    // (p. ej. ha escrito "3," que se interpreta como 3 — hay que dejar la coma)
    const currentNum = text === '' ? 0 : parseFloat(text.replace(',', '.'))
    if (currentNum !== value) {
      setText(value != null && value !== 0 ? String(value) : '')
    }
  }, [value])

  const handleChange = (e) => {
    let v = e.target.value
    if (!isDecimal) {
      v = v.replace(/[^\d]/g, '')
    } else {
      // Dígitos + coma + punto (el teclado ES del iPhone muestra coma)
      v = v.replace(/[^\d.,]/g, '')
      // Solo el primer separador decimal; el resto fuera
      const sepIdx = v.search(/[.,]/)
      if (sepIdx !== -1) {
        const sep = v[sepIdx]
        v = v.slice(0, sepIdx) + sep + v.slice(sepIdx + 1).replace(/[.,]/g, '')
      }
    }
    setText(v)
    const normalized = v.replace(',', '.')
    const num = (normalized === '' || normalized === '.') ? 0 : parseFloat(normalized)
    if (!isNaN(num)) onChange({ target: { value: num } })
  }

  return <input type="text" inputMode={isDecimal ? 'decimal' : 'numeric'}
    pattern={isDecimal ? '[0-9.,]*' : '[0-9]*'}
    value={text} onChange={handleChange}
    onFocus={e => { if (e.target.value === '0') { setText('') } }}
    placeholder="0" style={{ ...css.input, ...css.num, ...s }} {...props} />
}
