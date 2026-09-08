import { useId, useMemo, useState, useRef } from 'react'
import { theme, css } from '../lib/theme.js'
import { t, useLang, fmtMoney, fmtMonth } from '../lib/i18n.js'

/* ─────────────────────────────────────────────────────────────
   Gráfico de área

   Dos siluetas apiladas: la de abajo es el combustible y la de
   arriba el total, así que la franja que queda entre ambas es el
   gasto de taller. Con una sola se vería la tendencia pero se
   perdería el desglose, que es la mitad de la historia.

   Detrás va una copia desenfocada del propio dibujo. No es
   adorno: el contorno solo, sobre grafito, se queda plano y el
   halo le devuelve el cuerpo. Se hace con feGaussianBlur dentro
   del SVG, así que no cuesta una capa de más ni depende de
   backdrop-filter.

   Al pasar el ratón —o el dedo— sale una guía vertical con el mes
   y las cifras. El puntero se reparte en tantas franjas como
   meses y salta a la más cercana, así que no hay que acertarle a
   la línea. Todo lo que se coloca por encima del dibujo va en
   HTML y no en el SVG: el lienzo se estira con
   preserveAspectRatio="none", que deforma cualquier círculo y no
   respeta el tamaño del texto.
   ───────────────────────────────────────────────────────────── */

const PAD_X = 2
const TOP = 6
const BASE = 96

export default function AreaChart({
  data,
  height = 150,
  showAverage = false,
  showLabels = false,
  lowerColor,
  upperColor,
  lowerLabel,
  upperLabel,
  glow = true,
  interactive = true,
  format = fmtMoney,
}) {
  useLang()
  const uid = useId().replace(/:/g, '')
  const [active, setActive] = useState(null)
  const wrap = useRef(null)

  const low = lowerColor || theme.green
  const up = upperColor || theme.accent

  const { slots, avgY, area, areaLine, areaLow, areaLineLow, hasSplit } = useMemo(() => {
    const totals = data.map(d => d.total || 0)
    const max = Math.max(...totals, 1)
    const avg = totals.reduce((a, b) => a + b, 0) / (totals.length || 1)
    const y = v => BASE - (v / max) * (BASE - TOP)

    const step = (100 - PAD_X * 2) / (data.length || 1)
    const slots = data.map((d, i) => ({
      ...d,
      i,
      cx: PAD_X + step * (i + 0.5),
      yTop: y(d.total || 0),
      yLow: y(d.lower || 0),
    }))

    const hasSplit = slots.some(s => s.lower != null && s.upper != null)

    /* El contorno se prolonga en horizontal hasta los dos bordes.
       Si en vez de eso cayera a la base, con pocos puntos —cuatro
       vehículos, tres estados— quedarían dos cuñas vacías a los
       lados y el dibujo parecería descentrado. */
    const line = key => {
      const at = s => (key === 'total' ? s.yTop : s.yLow)
      const a = slots[0]
      const z = slots[slots.length - 1]
      if (!a) return ''
      const mid = slots.map(s => `${s.cx},${at(s)}`).join(' ')
      return `${PAD_X},${at(a)} ${mid} ${100 - PAD_X},${at(z)}`
    }

    const close = l => (l ? `${PAD_X},${BASE} ${l} ${100 - PAD_X},${BASE}` : '')

    const totalLine = line('total')
    const lowerLine = hasSplit ? line('lower') : null

    return {
      slots,
      avgY: y(avg),
      hasSplit,
      areaLine: totalLine,
      area: close(totalLine),
      areaLineLow: lowerLine,
      areaLow: lowerLine ? close(lowerLine) : null,
    }
  }, [data])

  const sel = active != null ? slots[active] : null

  /* Franja bajo el puntero. Se mide contra el ancho real del
     elemento, no contra el viewBox, porque el SVG va estirado. */
  const pick = clientX => {
    const box = wrap.current?.getBoundingClientRect()
    if (!box || !box.width || !slots.length) return null
    const r = (clientX - box.left) / box.width
    return Math.max(0, Math.min(slots.length - 1, Math.floor(r * slots.length)))
  }

  const track = e => setActive(pick(e.clientX))
  const trackTouch = e => {
    if (e.touches[0]) setActive(pick(e.touches[0].clientX))
  }

  const layer = (
    <>
      <polygon points={area} fill={`url(#a-${uid})`} />
      <polyline points={areaLine} fill="none" stroke={up} strokeWidth="2"
        vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      {hasSplit && (
        <>
          <polygon points={areaLow} fill={`url(#b-${uid})`} />
          <polyline points={areaLineLow} fill="none" stroke={low} strokeWidth="1.6"
            vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}
    </>
  )

  /* En un gráfico bajo —la columna de contexto, la miniatura de la
     tarjeta— el desglose no cabe, así que ahí el aviso se queda en
     una línea. Sale siempre dentro del recuadro: si se pone por
     encima acaba tapando el título del panel o el texto de al
     lado, que no son suyos. */
  const compact = height < 110

  return (
    <div style={{ width: '100%' }}>
      <div
        ref={wrap}
        style={{ position: 'relative', height, touchAction: 'pan-y' }}
        onMouseMove={interactive ? track : undefined}
        onMouseLeave={interactive ? () => setActive(null) : undefined}
        onTouchStart={interactive ? trackTouch : undefined}
        onTouchMove={interactive ? trackTouch : undefined}
        onTouchEnd={interactive ? () => setActive(null) : undefined}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <filter id={`blur-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.6" />
            </filter>
            <linearGradient id={`a-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={up} stopOpacity="0.45" />
              <stop offset="100%" stopColor={up} stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id={`b-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={low} stopOpacity="0.42" />
              <stop offset="100%" stopColor={low} stopOpacity="0.06" />
            </linearGradient>
          </defs>

          {glow && <g filter={`url(#blur-${uid})`} opacity="0.5">{layer}</g>}

          {showAverage && (
            <line x1="0" y1={avgY} x2="100" y2={avgY}
              stroke={theme.mutedLight} strokeWidth="1" strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke" opacity="0.7" />
          )}

          {layer}

          {sel && (
            <line x1={sel.cx} y1="0" x2={sel.cx} y2={BASE}
              stroke={theme.white} strokeWidth="1" opacity="0.4"
              vectorEffect="non-scaling-stroke" />
          )}

          <line x1="0" y1={BASE} x2="100" y2={BASE}
            stroke={theme.border} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>

        {sel && (
          <>
            <Dot x={sel.cx} y={sel.yTop} color={up} />
            {hasSplit && sel.total > 0 && <Dot x={sel.cx} y={sel.yLow} color={low} />}
          </>
        )}

        {sel && (
          <div style={{
            position: 'absolute',
            left: `${sel.cx}%`,
            top: compact ? 1 : 6,
            transform: `translateX(${sel.cx > 62 ? 'calc(-100% - 7px)' : sel.cx < 38 ? '7px' : '-50%'})`,
            background: theme.bg,
            border: `1px solid ${theme.rule}`,
            padding: compact ? '4px 7px' : '7px 9px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 3,
          }}>
            {compact ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={{ ...css.lbl, fontSize: 8 }}>{sel.label}</span>
                <span style={{ ...css.num, fontSize: 11, color: theme.white }}>{format(sel.total)}</span>
              </div>
            ) : (
              <>
                <div style={{ ...css.lbl, fontSize: 8 }}>{sel.label}</div>
                <div style={{ ...css.num, fontSize: 14, fontWeight: 600, color: theme.white, marginTop: 3 }}>
                  {format(sel.total)}
                </div>
                {hasSplit && (
                  <div style={{ marginTop: 6, display: 'grid', gap: 3 }}>
                    <Row color={up} label={upperLabel ?? t('common.maintenance')} value={format(sel.upper || 0)} />
                    <Row color={low} label={lowerLabel ?? t('common.fuel')} value={format(sel.lower || 0)} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showLabels && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '7px 2px 0', ...css.lbl, fontSize: 8,
        }}>
          <span>{data[0]?.label}</span>
          <span style={{ color: theme.white }}>{data[data.length - 1]?.label}</span>
        </div>
      )}
    </div>
  )
}

/* El punto va en HTML: dentro del SVG, con el lienzo estirado a lo
   ancho, un círculo saldría hecho un óvalo. */
function Dot({ x, y, color }) {
  return (
    <span style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      width: 6, height: 6, marginLeft: -3, marginTop: -3,
      borderRadius: '50%', background: color,
      boxShadow: `0 0 0 2px ${theme.bg}`,
      pointerEvents: 'none', zIndex: 2,
    }} />
  )
}

function Row({ color, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 6, height: 6, background: color, flexShrink: 0 }} />
      <span style={{ ...css.lbl, fontSize: 8, flex: 1 }}>{label}</span>
      <span style={{ ...css.num, fontSize: 10.5, color: theme.text }}>{value}</span>
    </div>
  )
}

/* Convierte los meses de monthlySpend() en lo que espera el gráfico. */
export function toAreaData(months) {
  return months.map(m => ({
    label: fmtMonth(m.date),
    total: m.total,
    lower: m.fuel,
    upper: m.maint,
  }))
}
