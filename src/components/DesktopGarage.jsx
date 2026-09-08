import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Wrench, CheckSquare, Package, Fuel, TrendingUp,
  Maximize2, Edit2, ShieldCheck, Trash2,
} from 'lucide-react'
import { theme, css, FONT } from '../lib/theme.js'
import {
  getMaintenanceRecords, getVehicleTodos, getCarParts,
  getFuelLogs, getKmLogs, getItvRecords,
} from '../lib/api.js'
import { MAINT_TYPES, getMaintStatus, formatDate, getMaintenanceForVehicle, fuelLabel, transLabel } from '../lib/constants.js'
import { t, useLang, fmtNum, fmtMoney } from '../lib/i18n.js'
import { Gauge, StatusBadge, Loader } from './ui.jsx'
import SpendChart from './SpendChart.jsx'
import { FOOTER_HEIGHT } from './Footer.jsx'

/* ─────────────────────────────────────────────────────────────
   Garaje en pantalla ancha · raíl y ficha

   A la izquierda, todos los vehículos siempre visibles. A la
   derecha, el seleccionado: una versión RECORTADA de su ficha, con
   las mismas pestañas que la pantalla completa pero con menos
   columnas y solo las filas que caben. Para el detalle entero está
   el botón de «ficha completa», que abre la vista de siempre.

   La idea es no obligar a ir y volver para comparar dos coches, que
   es lo que pasa cuando el listado y el detalle son dos pantallas.
   ───────────────────────────────────────────────────────────── */

/* Funciones, no constantes: si se resolvieran al importar, estos
   paneles se quedarían con los colores del tema de arranque y no
   cambiarían al pasar a claro ni al cambiar de acento. */
const panel = () => ({
  background: theme.card,
  border: `1px solid ${theme.border}`,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
})

function PanelHead({ children, right }) {
  return (
    <div style={{
      borderBottom: `1px solid ${theme.border}`,
      padding: '10px 13px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, flexShrink: 0,
    }}>
      <span style={css.lbl}>{children}</span>
      {right != null && <span style={{ ...css.lbl, color: theme.accent }}>{right}</span>}
    </div>
  )
}

/* Salud de 0 a 100, igual que en la lista de móvil. */
function health(maint, currentKm) {
  if (!maint || maint.length === 0) return { score: 100, ok: 0, warn: 0, overdue: 0 }
  let ok = 0, warn = 0, overdue = 0
  for (const r of maint) {
    const s = getMaintStatus(r, currentKm)
    if (s === 'ok') ok++
    else if (s === 'warn') warn++
    else overdue++
  }
  return { score: Math.round(((ok + warn * 0.5) / maint.length) * 100), ok, warn, overdue }
}

// ─── Raíl de vehículos ───────────────────────────────────────

function Rail({ cars, meta, selectedId, onSelect, onAdd, width }) {
  return (
    <div style={{ ...panel(), width, flexShrink: 0 }}>
      <PanelHead right={<span style={{ cursor: 'pointer' }} onClick={onAdd}>+ {t('common.add')}</span>}>
        {t('gar.vehicles')} · {cars.length}
      </PanelHead>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {cars.map(car => {
          const mt = meta[car.id] || { maint: [] }
          const { score, overdue, warn } = health(mt.maint, car.current_km)
          const on = car.id === selectedId
          const gaugeColor = overdue > 0 ? theme.red : warn > 0 ? theme.yellow : theme.green
          return (
            <button
              key={car.id}
              onClick={() => onSelect(car.id)}
              style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 11,
                /* El orden importa: 'border' primero y los lados
                   después, o el atajo borra el filete de la izquierda. */
                border: 'none',
                borderBottom: `1px solid ${theme.border}`,
                borderLeft: on ? `3px solid ${theme.accent}` : '3px solid transparent',
                padding: '12px 13px 12px 10px',
                background: on ? theme.bg : 'transparent',
              }}
            >
              <Gauge value={score} color={gaugeColor} size={32} bg={on ? theme.bg : theme.card} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...css.h3, fontSize: 12.5, display: 'block' }}>
                  {car.brand} {car.model}
                </span>
                <span style={{ ...css.lbl, fontSize: 8, display: 'block', marginTop: 4 }}>
                  {fmtNum(car.current_km)} {t('common.km')} · {car.plate}
                </span>
              </span>
              {overdue > 0 && (
                <span style={{ ...css.badge(theme.redSoft, theme.red), padding: '2px 5px' }}>{overdue}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Ficha recortada ─────────────────────────────────────────

function CondensedCard({ car, data, onOpenFull, onEdit, wide, context, rows }) {
  useLang()
  const [tab, setTab] = useState('maint')

  const { maintenance, todos, parts, fuelLogs, kmLogs, itv } = data
  const stats = health(maintenance, car.current_km)
  const cost = useMemo(
    () => maintenance.reduce((s, m) => s + Number(m.cost || 0), 0)
        + fuelLogs.reduce((s, f) => s + Number(f.total_cost || 0), 0),
    [maintenance, fuelLogs]
  )

  const pendingTodos = todos.filter(x => !x.completed).length
  const latestItv = itv[0] || null

  const tabs = [
    { id: 'maint', icon: Wrench, label: t('car.tabMaint'), badge: stats.overdue || null },
    { id: 'todos', icon: CheckSquare, label: t('car.tabTodos'), badge: pendingTodos || null },
    { id: 'parts', icon: Package, label: t('car.tabParts') },
    { id: 'fuel', icon: Fuel, label: t('car.tabFuel') },
    { id: 'km', icon: TrendingUp, label: t('car.tabKm') },
  ]

  /* Cada pestaña devuelve {total, node}: el total es para el pie
     «mostrando N de M», que es lo que avisa de que aquí no está todo. */
  const content = () => {
    if (tab === 'maint') {
      const types = getMaintenanceForVehicle(car.vehicle_type, car.fuel)
      const list = types
        .map(mt => ({ mt, rec: maintenance.find(m => m.type_id === mt.id) }))
        .map(x => ({ ...x, st: x.rec ? getMaintStatus(x.rec, car.current_km) : null }))
        .sort((a, b) => {
          const rank = s => (s === 'overdue' ? 0 : s === 'warn' ? 1 : s === 'ok' ? 2 : 3)
          return rank(a.st) - rank(b.st)
        })
      return {
        total: list.length,
        node: (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={css.th}>{t('car.element')}</th>
                <th style={css.th}>{t('common.state')}</th>
                {wide && <th style={{ ...css.th, textAlign: 'right' }}>{t('car.lastKm')}</th>}
                <th style={{ ...css.th, textAlign: 'right' }}>{t('car.nextLabel')}</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, rows).map(({ mt, rec, st }) => (
                <tr key={mt.id}>
                  <td style={{ ...css.td, fontWeight: 600, color: theme.white }}>{mt.name}</td>
                  <td style={css.td}>
                    {st ? <StatusBadge status={st} /> : <span style={css.lbl}>{t('common.noData')}</span>}
                  </td>
                  {wide && (
                    <td style={{ ...css.td, ...css.num, textAlign: 'right' }}>
                      {rec ? fmtNum(rec.last_km) : '—'}
                    </td>
                  )}
                  <td style={{ ...css.td, ...css.num, textAlign: 'right' }}>
                    {rec ? `${fmtNum(rec.next_km - car.current_km)} ${t('common.km')}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      }
    }

    if (tab === 'todos') {
      const list = [...todos].sort((a, b) => Number(a.completed) - Number(b.completed))
      return {
        total: list.length,
        node: list.length === 0 ? <Empty /> : (
          <div>
            {list.slice(0, rows).map(x => (
              <div key={x.id} style={rowStyle()}>
                <span style={{
                  ...dot,
                  background: x.completed ? theme.mutedLight
                    : x.priority === 'alta' ? theme.red
                    : x.priority === 'media' ? theme.yellow : theme.green,
                }} />
                <span style={{
                  flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', fontSize: 12.5,
                  textDecoration: x.completed ? 'line-through' : 'none',
                  color: x.completed ? theme.mutedLight : theme.text,
                }}>{x.title}</span>
              </div>
            ))}
          </div>
        ),
      }
    }

    if (tab === 'parts') {
      return {
        total: parts.length,
        node: parts.length === 0 ? <Empty /> : (
          <div>
            {parts.slice(0, rows).map(p => (
              <div key={p.id} style={rowStyle()}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: 600, color: theme.white }}>{p.name}</span>
                <span style={{ ...css.lbl, ...css.num, fontSize: 9.5 }}>{p.reference || '—'}</span>
              </div>
            ))}
          </div>
        ),
      }
    }

    if (tab === 'fuel') {
      return {
        total: fuelLogs.length,
        node: fuelLogs.length === 0 ? <Empty /> : (
          <div>
            {fuelLogs.slice(0, rows).map(f => (
              <div key={f.id} style={rowStyle()}>
                <span style={{ ...css.lbl, fontSize: 9.5, minWidth: 74 }}>{formatDate(f.date)}</span>
                <span style={{ flex: 1, ...css.num, fontSize: 11.5, color: theme.text }}>
                  {fmtNum(f.liters, 2)} L
                </span>
                <span style={{ ...css.num, fontSize: 11.5, color: theme.white }}>{fmtMoney(f.total_cost, 2)}</span>
              </div>
            ))}
          </div>
        ),
      }
    }

    return {
      total: kmLogs.length,
      node: kmLogs.length === 0 ? <Empty /> : (
        <div>
          {kmLogs.slice(0, rows).map(k => (
            <div key={k.id} style={rowStyle()}>
              <span style={{ ...css.lbl, fontSize: 9.5, minWidth: 74 }}>{formatDate(k.date)}</span>
              <span style={{ flex: 1, ...css.num, fontSize: 11.5, color: theme.white }}>
                {fmtNum(k.km)} {t('common.km')}
              </span>
            </div>
          ))}
        </div>
      ),
    }
  }

  const { total, node } = content()
  const shown = Math.min(rows, total)

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 13 }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
          <Gauge
            value={stats.score}
            color={stats.overdue > 0 ? theme.red : stats.warn > 0 ? theme.yellow : theme.green}
            size={40}
          />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ ...css.h1, fontSize: 23 }}>{car.brand} {car.model}</h1>
            <div style={{ ...css.lbl, marginTop: 6 }}>
              {car.plate} · {fmtNum(car.current_km)} {t('common.km')} · {car.year} · {fuelLabel(car.fuel)} · {transLabel(car.transmission)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onEdit} style={css.btnOutline}><Edit2 size={13} /> {t('common.edit')}</button>
          <button onClick={onOpenFull} style={css.btn()}><Maximize2 size={13} /> {t('gar.fullCard')}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 13, flex: 1, minHeight: 0 }}>

        {/* Columna principal */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${context ? 4 : 5}, 1fr)`,
            borderTop: `1px solid ${theme.rule}`, borderBottom: `1px solid ${theme.border}`, flexShrink: 0,
          }}>
            <Kpi label={t('car.statOk')} value={stats.ok} color={theme.green} />
            <Kpi label={t('car.statWarn')} value={stats.warn} color={theme.yellow} />
            <Kpi label={t('car.statOverdue')} value={stats.overdue} color={theme.red} />
            <Kpi label={t('stats.totalSpend')} value={fmtMoney(cost)} />
            {/* Sin columna de contexto, la ITV sube aquí: es el dato
                que no se puede perder por falta de ancho. */}
            {!context && (
              <Kpi
                label={t('itv.short')}
                value={itvSummary(latestItv).text}
                color={itvSummary(latestItv).color}
              />
            )}
          </div>

          <div style={{ ...panel(), flex: 1 }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, background: theme.bg, flexShrink: 0 }}>
              {tabs.map(x => {
                const Icon = x.icon
                const on = tab === x.id
                return (
                  <button key={x.id} onClick={() => setTab(x.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '9px 13px',
                    background: on ? theme.card : 'transparent', border: 'none',
                    borderBottom: `2px solid ${on ? theme.accent : 'transparent'}`,
                    color: on ? theme.accent : theme.mutedLight, cursor: 'pointer',
                    fontFamily: FONT.mono, fontSize: 9, fontWeight: 500,
                    letterSpacing: '0.13em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    <Icon size={13} /> {x.label}
                    {x.badge != null && (
                      <span style={{
                        background: theme.red, color: theme.accentInk, fontSize: 8,
                        padding: '0 4px', minWidth: 14, textAlign: 'center',
                      }}>{x.badge}</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>{node}</div>

            <div style={{
              marginTop: 'auto', borderTop: `1px solid ${theme.border}`,
              padding: '10px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={css.lbl}>{t('gar.showing', { n: shown, m: total })}</span>
              <button onClick={onOpenFull} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                ...css.lbl, color: theme.accent,
              }}>{t('gar.viewAll')} →</button>
            </div>
          </div>
        </div>

        {/* Columna de contexto: no cambia al cambiar de pestaña.
            Por debajo de 1400 px no cabe sin ahogar la tabla, así que
            desaparece y sus datos se reparten: la ITV sube a los
            indicadores y el resto vive en la ficha completa. */}
        {context && (
        <div style={{ width: wide ? 330 : 290, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 13 }}>

          <div style={panel()}>
            <PanelHead right={<ItvChip itv={latestItv} />}>{t('itv.short')}</PanelHead>
            <div style={{ padding: '11px 13px' }}>
              {latestItv ? (
                <>
                  <div style={{ ...css.num, fontSize: 15, color: theme.white }}>
                    {formatDate(latestItv.expiry_date) || '—'}
                  </div>
                  <div style={{ ...css.lbl, fontSize: 8, marginTop: 5 }}>
                    {t(`itv.${latestItv.result === 'favorable' ? 'favorable' : latestItv.result === 'negativa' ? 'negative' : 'unfavorable'}`)}
                    {latestItv.station ? ` · ${latestItv.station}` : ''}
                  </div>
                </>
              ) : <span style={css.lbl}>{t('itv.empty')}</span>}
            </div>
          </div>

          <div style={panel()}>
            <PanelHead right={pendingTodos || null}>{t('car.tabTodos')}</PanelHead>
            {todos.filter(x => !x.completed).slice(0, 3).map(x => (
              <div key={x.id} style={rowStyle()}>
                <span style={{
                  ...dot,
                  background: x.priority === 'alta' ? theme.red
                    : x.priority === 'media' ? theme.yellow : theme.green,
                }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>
                  {x.title}
                </span>
              </div>
            ))}
            {pendingTodos === 0 && (
              <div style={{ padding: '11px 13px' }}><span style={css.lbl}>{t('todo.empty')}</span></div>
            )}
          </div>

          <div style={{ ...panel(), flex: 1 }}>
            <PanelHead right={t('chart.12m')}>{t('chart.monthly')}</PanelHead>
            <SpendChart maintenance={maintenance} fuelLogs={fuelLogs} height={wide ? 66 : 56} />
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

/* Resumen de la ITV en una sola celda, para cuando no hay columna. */
function itvSummary(itv) {
  if (!itv || !itv.expiry_date) return { text: '—', color: theme.mutedLight }
  const days = Math.floor((new Date(itv.expiry_date) - new Date()) / 86400000)
  if (days < 0) return { text: t('dash.itvExpired'), color: theme.red }
  return { text: `${days} d`, color: days <= 30 ? theme.yellow : theme.green }
}

const rowStyle = () => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 13px', borderBottom: `1px solid ${theme.border}`,
})
const dot = { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 }

function Empty() {
  return <div style={{ padding: '14px 13px' }}><span style={css.lbl}>{t('gar.nothing')}</span></div>
}

function Kpi({ label, value, color }) {
  return (
    <div style={{ padding: '10px 12px', borderRight: `1px solid ${theme.border}` }}>
      <div style={css.lbl}>{label}</div>
      <div style={{ ...css.num, fontSize: 19, fontWeight: 600, marginTop: 5, color: color || theme.white, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

function ItvChip({ itv }) {
  if (!itv || !itv.expiry_date) return null
  const days = Math.floor((new Date(itv.expiry_date) - new Date()) / 86400000)
  if (days < 0) return <span style={css.badge(theme.redSoft, theme.red)}>{t('dash.itvExpired')}</span>
  if (days <= 30) return <span style={css.badge(theme.yellowSoft, theme.yellow)}>{days} d</span>
  return <span style={css.badge(theme.greenSoft, theme.green)}>{days} d</span>
}

// ─── Contenedor ──────────────────────────────────────────────

export default function DesktopGarage({ cars, meta, wide, context, tall, onAdd, onOpenFull, onEdit, onToast }) {
  useLang()
  const [selectedId, setSelectedId] = useState(cars[0]?.id ?? null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Si el vehículo elegido desaparece, se cae al primero de la lista.
  useEffect(() => {
    if (!cars.length) { setSelectedId(null); return }
    if (!cars.some(c => c.id === selectedId)) setSelectedId(cars[0].id)
  }, [cars, selectedId])

  useEffect(() => {
    if (!selectedId) { setData(null); setLoading(false); return }
    let alive = true
    setLoading(true)
    Promise.all([
      getMaintenanceRecords(selectedId), getVehicleTodos(selectedId), getCarParts(selectedId),
      getFuelLogs(selectedId), getKmLogs(selectedId), getItvRecords(selectedId),
    ]).then(([maintenance, todos, parts, fuelLogs, kmLogs, itv]) => {
      if (!alive) return
      setData({ maintenance, todos, parts, fuelLogs, kmLogs, itv })
      setLoading(false)
    }).catch(err => {
      if (!alive) return
      onToast?.(t('common.error') + ': ' + err.message, 'error')
      setLoading(false)
    })
    return () => { alive = false }
  }, [selectedId])

  const car = cars.find(c => c.id === selectedId)

  return (
    <div style={{
      ...css.container, padding: '20px 20px 24px',
      display: 'flex', gap: 16, alignItems: 'stretch',
      /* La barra mide 54 y el pie 38; la franja de la demo, cuando
         está, se anuncia en --pm-banner. Si no se descuentan los
         tres, el garaje empuja el pie fuera de la pantalla. */
      height: `calc(100dvh - 54px - ${FOOTER_HEIGHT}px - var(--pm-banner, 0px))`, minHeight: 560,
    }}>
      <Rail cars={cars} meta={meta} selectedId={selectedId} onSelect={setSelectedId}
        onAdd={onAdd} width={context ? 290 : 240} />

      {!car ? (
        <div style={{ ...panel(), flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <span style={css.lbl}>{t('gar.pick')}</span>
        </div>
      ) : loading || !data ? (
        <div style={{ flex: 1 }}><Loader text={t('common.loading')} /></div>
      ) : (
        <CondensedCard
          key={car.id}
          car={car}
          data={data}
          wide={wide}
          context={context}
          /* Cuántas filas caben de verdad: sin columna de contexto la
             tabla es más ancha pero la pantalla suele ser más baja. */
          rows={tall ? (wide ? 14 : context ? 11 : 9) : (context ? 7 : 6)}
          onOpenFull={() => onOpenFull(car.id)}
          onEdit={() => onOpenFull(car.id)}
        />
      )}
    </div>
  )
}
