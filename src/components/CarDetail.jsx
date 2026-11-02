import { useState, useEffect, useMemo } from 'react'
import {
  Wrench, Edit2, Trash2, ChevronLeft, ChevronDown, Calendar,
  Fuel, Settings, TrendingUp, Save, Car, Bike,
  Plus, Package, ExternalLink, FileDown, Euro, CheckSquare, FileText, FileSpreadsheet,
  Link2, Hammer
} from 'lucide-react'
import { theme, css } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import {
  updateCar, getMaintenanceRecords, upsertMaintenanceRecord,
  deleteMaintenanceRecord, getKmLogs, createKmLog, deleteKmLog,
  getCarParts, createCarPart, deleteCarPart, getFuelLogs, getItvRecords, getVehicleTodos, getWorkshops,
  getCustomJobs, createCustomJob, updateCustomJob, deleteCustomJob
} from '../lib/api.js'
import {
  MAINT_TYPES, FUEL_TYPES, TRANS_TYPES, VEHICLE_TYPES, getMaintStatus, formatDate,
  getMaintenanceForVehicle, fuelLabel, transLabel,
  maintName, maintDefKm, maintDefMonths, hasSides, hasSideData, worstOf, worstSide,
  SIDES, sideLabel, sideShort, nextFrom, byUrgency,
} from '../lib/constants.js'
import { Modal, Field, Loader, ResponsiveGrid2, DateInput, NumInput, useConfirm } from './ui.jsx'
import { MaintIcon } from '../lib/maintIcons.jsx'
import SwipeArea, { useEdgeBack } from './SwipeArea.jsx'
import { t, useLang, fmtNum, fmtMoney } from '../lib/i18n.js'
import FuelTab from './FuelTab.jsx'
import ExpenseTab from './ExpenseTab.jsx'
import ItvCard from './ItvCard.jsx'
import TodoTab from './TodoTab.jsx'
import SpendChart from './SpendChart.jsx'
import TwoColumn, { useTwoCol, Panel, AttentionList } from './TwoColumn.jsx'
import { exportCarPdf } from '../lib/pdfExport.js'
import { exportCarExcel } from '../lib/excelExport.js'

const today = new Date().toISOString().split('T')[0]

/* ── Tab Bar ── */
function TabBar({ tabs, active, onChange, isMobile }) {
  /* Una sola fila, con el filete del acento bajo la elegida, que es
     como Acero marca lo seleccionado. En el móvil la fila se desliza
     de lado: antes eran tres filas de botones que empujaban la lista
     media pantalla hacia abajo. Desde la sexta pestaña, en ancho, se
     aprieta el botón en vez de cortar la palabra. */
  const apretado = !isMobile && tabs.length > 5
  return (
    <div style={{
      marginBottom: 16, display: 'flex', gap: 0,
      borderBottom: `1px solid ${theme.border}`,
      ...(isMobile ? { overflowX: 'auto', scrollbarWidth: 'none' } : {}),
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} aria-current={active === t.id ? 'page' : undefined} style={{
          display: 'flex', alignItems: 'center', gap: apretado ? 6 : 7,
          flex: isMobile ? 'none' : 1, justifyContent: 'center',
          background: 'transparent',
          color: active === t.id ? theme.white : theme.muted,
          border: 'none', borderBottom: `3px solid ${active === t.id ? theme.accent : 'transparent'}`,
          marginBottom: -1,
          borderRadius: 0, padding: isMobile ? '12px 14px' : (apretado ? '11px 8px' : '11px 16px'), cursor: 'pointer',
          fontWeight: active === t.id ? 600 : 500,
          fontSize: isMobile ? 14 : (apretado ? 13 : 13.5), fontFamily: 'inherit', transition: 'color .15s', position: 'relative',
          whiteSpace: 'nowrap', minWidth: 0,
        }}>
          {t.icon}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
          {t.badge && (
            <span style={{
              background: theme.accent, color: '#000', borderRadius: 0,
              minWidth: 17, height: 17, padding: '0 5px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, flexShrink: 0,
            }}>{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ── Mobile Maintenance Card ── */
/* El color de un estado. Se usa para el filete del lado que manda,
   así que sale del tema y no de una constante de módulo. */
const colorEstado = (status) =>
  status === 'overdue' ? theme.red : status === 'warn' ? theme.yellow : theme.green

/* Los dos lados de un eje, uno por línea. El que manda —el que
   decide cuándo toca— lleva el filete al canto en el color de su
   estado, que es como se marca lo importante en esta interfaz. */
function SideLines({ record, color, width = 66 }) {
  const peor = worstSide(record)
  return (
    <div style={{ display: 'grid', gap: 3 }}>
      {SIDES.map(lado => {
        const km = record[`last_km_${lado}`]
        const fecha = record[`last_date_${lado}`]
        const manda = lado === peor
        return (
          <div key={lado} style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            borderLeft: `3px solid ${manda ? color : 'transparent'}`, paddingLeft: 7,
          }}>
            <span style={{ ...css.lbl, width, flexShrink: 0 }}>{sideLabel(lado)}</span>
            <span style={{ ...css.num, fontSize: 12, color: manda ? theme.white : theme.muted }}>
              {km != null ? `${fmtNum(km)} ${t('common.km')}` : '—'}
            </span>
            <span style={{ ...css.num, fontSize: 11, color: theme.mutedLight }}>
              {fecha ? formatDate(fecha) : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* El recambio enlazado, en un distintivo que lleva a su ficha. */
function PartChip({ part, onClick }) {
  if (!part) return null
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onClick?.(part) }}
      style={{ ...css.badge(theme.accentSoft, theme.accent), cursor: 'pointer', maxWidth: '100%' }}>
      <Link2 size={10} /> {part.reference || part.name}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   La lista de mantenimientos, ordenada por lo que toca

   La ficha contesta una pregunta: ¿qué le toca a este vehículo?
   Antes eran veinticuatro filas del mismo peso en el orden fijo de
   la lista, con las vencidas perdidas entre las que no tienen
   datos. Ahora van en grupos —vencido, próximo, al día— y, dentro
   de cada uno, por lo que antes toca. Lo que nunca se ha
   apuntado se recoge al final en fichas de «+».
   ───────────────────────────────────────────────────────────── */

/* Lo que se lee en la columna «Queda»: la cifra y una línea debajo.
   Un próximo a cero no es un vencido: es una pieza sin intervalo. */
function quedaDe(record, status, progress) {
  const fecha = record.next_date ? formatDate(record.next_date) : null
  const color = status === 'overdue' ? theme.red : status === 'warn' ? theme.yellow : theme.white
  const { kmLeft, daysLeft } = progress || {}
  if (kmLeft != null) {
    if (kmLeft <= 0) {
      return { main: t('maint.overBy', { km: fmtNum(-kmLeft) }), sub: t('maint.dueAt', { km: fmtNum(record.next_km) }), color }
    }
    /* Quedan km pero la fecha ya pasó: manda la fecha. */
    if (daysLeft != null && daysLeft <= 0) {
      return { main: t('maint.dateOver', { date: fecha }), sub: `${fmtNum(kmLeft)} ${t('common.km')}`, color }
    }
    return { main: `${fmtNum(kmLeft)} ${t('common.km')}`, sub: fecha ? t('maint.orOn', { date: fecha }) : null, color }
  }
  if (fecha) {
    return { main: daysLeft != null && daysLeft <= 0 ? t('maint.dateOver', { date: fecha }) : fecha, sub: null, color }
  }
  return { main: t('maint.noInterval'), sub: null, color: theme.muted, quiet: true }
}

const colorBarra = (status) =>
  status === 'overdue' ? theme.red : status === 'warn' ? theme.yellow : theme.mutedLight

/* La vida gastada, en un trazo fino. Solo lleva color cuando hay
   que hacer algo; lo que está al día se queda en gris. */
function VidaBar({ fraction, status, width = 110 }) {
  if (fraction == null) return <span style={{ display: 'block', textAlign: 'right', color: theme.mutedLight }}>—</span>
  return (
    <div style={{ height: 3, width, background: theme.border, marginLeft: 'auto' }}
      role="img" aria-label={`${Math.round(fraction * 100)} %`}>
      <div style={{ height: '100%', width: `${Math.round(fraction * 100)}%`, background: colorBarra(status) }} />
    </div>
  )
}

/* Los mantenimientos del vehículo, repartidos en grupos. */
function agrupar(types, maintenance, currentKm) {
  const apuntados = [], vacios = []
  types.forEach(mt => {
    const record = maintenance.find(x => x.type_id === mt.id)
    if (record) apuntados.push({ mt, record })
    else vacios.push(mt)
  })
  const ordenados = byUrgency(apuntados, currentKm)
  return {
    overdue: ordenados.filter(x => x.status === 'overdue'),
    warn: ordenados.filter(x => x.status === 'warn'),
    ok: ordenados.filter(x => x.status === 'ok'),
    empty: vacios,
  }
}

const GRUPOS = [
  { id: 'overdue', label: () => t('car.statOverdue'), color: () => theme.red },
  { id: 'warn', label: () => t('car.statWarn'), color: () => theme.yellow },
  { id: 'ok', label: () => t('car.statOk'), color: () => theme.green },
]

function GrupoTitulo({ label, n, color, extra, mob }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: mob ? '14px 16px 6px' : '18px 20px 8px',
      fontSize: 13.5, fontWeight: 600, color: theme.white,
    }}>
      <span style={{ width: 8, height: 8, background: color, flexShrink: 0 }} />
      {label}
      <span style={{ ...css.num, color: theme.muted, fontWeight: 500 }}>{n}</span>
      {extra && <span style={{ fontWeight: 400, color: theme.muted, fontSize: 12.5 }}>· {extra}</span>}
    </div>
  )
}

/* Las piezas que nunca se han apuntado: una ficha por pieza, y un
   toque abre su formulario. Antes era una fila entera de «sin
   datos» por cada una. */
function Vacios({ items, vehicleType, onAdd, mob }) {
  if (!items.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: mob ? '4px 16px 16px' : '4px 20px 20px' }}>
      {items.map(mt => (
        <button key={mt.id} type="button" onClick={() => onAdd(mt.id)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'transparent', color: theme.text, cursor: 'pointer',
          border: `1px dashed ${theme.rule}`, padding: mob ? '9px 11px' : '6px 10px',
          fontFamily: 'inherit', fontSize: 13, transition: 'border-color .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = theme.rule }}>
          <Plus size={13} color={theme.accent} /> {maintName(mt, vehicleType)}
        </button>
      ))}
    </div>
  )
}

/* ── Escritorio: una tabla, con los grupos como filas de título ── */
function MaintTable({ grupos, vehicleType, parts, onEdit, onOpenPart }) {
  const total = grupos.overdue.length + grupos.warn.length + grupos.ok.length + grupos.empty.length
  const lapiz = (fila, o) => { const l = fila.querySelector('[data-lapiz]'); if (l) l.style.opacity = o }
  const fila = ({ mt, record, status, progress }) => {
    const q = quedaDe(record, status, progress)
    const porLados = hasSides(mt, vehicleType) && hasSideData(record)
    const peor = porLados ? worstSide(record) : null
    const recambio = parts.find(x => x.id === record.part_id) || null
    return (
      <tr key={mt.id} style={{ cursor: 'pointer' }}
        onClick={() => onEdit(mt.id)}
        onMouseEnter={e => { e.currentTarget.style.background = theme.cardHover; lapiz(e.currentTarget, 1) }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; lapiz(e.currentTarget, 0.35) }}>
        <td style={{ ...css.td, paddingLeft: 20, fontWeight: 600, color: theme.white }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <MaintIcon id={mt.id} color={theme.muted} />
            {maintName(mt, vehicleType)}
          </span>
          {recambio && (
            <div style={{ marginTop: 5, marginLeft: 25 }}>
              <PartChip part={recambio} onClick={onOpenPart} />
            </div>
          )}
        </td>
        <td style={{ ...css.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
          <div style={{ ...css.num, fontSize: 14, fontWeight: q.quiet ? 400 : 600, color: q.color }}>{q.main}</div>
          {q.sub && <div style={{ ...css.num, fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{q.sub}</div>}
        </td>
        <td style={{ ...css.td, width: 130 }}>
          <VidaBar fraction={progress?.fraction} status={status} />
        </td>
        <td style={{ ...css.td, textAlign: 'right', whiteSpace: 'nowrap', color: theme.muted }}>
          {porLados ? (
            <div style={{ display: 'grid', gap: 2, justifyItems: 'end' }}>
              {SIDES.map(lado => (
                <div key={lado} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ ...css.lbl, fontSize: 10 }}>{sideShort(lado)}</span>
                  <span style={{ ...css.num, fontSize: 12.5, color: lado === peor ? theme.white : theme.muted }}>
                    {record[`last_km_${lado}`] != null ? fmtNum(record[`last_km_${lado}`]) : '—'}
                    {' · '}
                    {record[`last_date_${lado}`] ? formatDate(record[`last_date_${lado}`]) : '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ ...css.num, fontSize: 12.5 }}>
              {record.last_km != null ? fmtNum(record.last_km) : '—'} · {record.last_date ? formatDate(record.last_date) : '—'}
            </span>
          )}
        </td>
        <td style={{ ...css.td, ...css.num, textAlign: 'right', whiteSpace: 'nowrap', color: record.cost ? theme.white : theme.mutedLight }}>
          {record.cost ? fmtMoney(record.cost) : '—'}
        </td>
        <td style={{ ...css.td, width: 40, textAlign: 'center' }}>
          <span data-lapiz style={{ opacity: 0.35, color: theme.muted, transition: 'opacity .15s', display: 'inline-flex' }}
            aria-label={t('common.edit')}>
            <Edit2 size={14} />
          </span>
        </td>
      </tr>
    )
  }
  const titulo = (g, n) => (
    <tr key={`g-${g.id}`}>
      <td colSpan={6} style={{ padding: 0 }}>
        <GrupoTitulo label={g.label()} n={n} color={g.color()} />
      </td>
    </tr>
  )
  return (
    <div style={{ ...css.card, padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...css.th, paddingLeft: 20 }}>{t('car.element')}</th>
              <th style={{ ...css.th, textAlign: 'right' }}>{t('car.left')}</th>
              <th style={{ ...css.th, textAlign: 'right' }}>{t('car.life')}</th>
              <th style={{ ...css.th, textAlign: 'right' }}>{t('car.lastLabel')}</th>
              <th style={{ ...css.th, textAlign: 'right' }}>{t('common.cost')}</th>
              <th style={css.th} />
            </tr>
          </thead>
          <tbody>
            {GRUPOS.flatMap(g => grupos[g.id].length
              ? [titulo(g, grupos[g.id].length), ...grupos[g.id].map(fila)]
              : [])}
          </tbody>
        </table>
      </div>
      {grupos.empty.length > 0 && (
        <>
          <GrupoTitulo label={t('maint.notLogged')} n={grupos.empty.length} color={theme.rule}
            extra={t('maint.tapToLog')} />
          <Vacios items={grupos.empty} vehicleType={vehicleType} onAdd={onEdit} />
        </>
      )}
      {total === 0 && <p style={{ ...css.lbl, padding: 20 }}>{t('common.noData')}</p>}
    </div>
  )
}

/* ── Móvil: filas de 60 px; lo que no urge, plegado ── */
function MaintListMobile({ grupos, vehicleType, onEdit }) {
  /* Si no hay nada vencido ni próximo, lo que está al día arranca
     abierto: una pantalla con dos grupos plegados no dice nada. */
  const nadaUrgente = !grupos.overdue.length && !grupos.warn.length
  const [abiertos, setAbiertos] = useState({ ok: nadaUrgente, empty: false })
  const alternar = id => setAbiertos(a => ({ ...a, [id]: !a[id] }))

  const fila = ({ mt, record, status, progress }) => {
    const q = quedaDe(record, status, progress)
    return (
      <button key={mt.id} type="button" onClick={() => onEdit(mt.id)} style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60,
        padding: '10px 16px 10px 0', background: 'transparent', border: 'none',
        borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', textAlign: 'left',
        fontFamily: 'inherit', color: theme.text,
      }}>
        <span style={{ width: 3, alignSelf: 'stretch', background: status === 'ok' ? 'transparent' : colorBarra(status), flexShrink: 0 }} />
        <MaintIcon id={mt.id} color={theme.muted} size={16} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', color: theme.white, fontWeight: 600, fontSize: 14.5 }}>{maintName(mt, vehicleType)}</span>
          <span style={{ display: 'block', ...css.num, fontSize: 12, color: theme.muted, marginTop: 2 }}>
            {record.last_km != null ? fmtNum(record.last_km) : '—'}{record.last_date ? ` · ${formatDate(record.last_date)}` : ''}
          </span>
        </span>
        <span style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{ display: 'block', ...css.num, fontSize: 14, fontWeight: q.quiet ? 400 : 600, color: q.color }}>{q.main}</span>
          {q.sub && <span style={{ display: 'block', ...css.num, fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{q.sub}</span>}
        </span>
      </button>
    )
  }

  const plegable = (id, label, color, n, contenido) => (
    <div key={id}>
      <button type="button" onClick={() => alternar(id)} aria-expanded={abiertos[id]} style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%', minHeight: 48,
        padding: '0 16px', background: 'transparent', border: 'none',
        borderBottom: `1px solid ${theme.border}`, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: theme.white, textAlign: 'left',
      }}>
        <span style={{ width: 8, height: 8, background: color, flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{label} <span style={{ ...css.num, color: theme.muted, fontWeight: 500 }}>{n}</span></span>
        <ChevronDown size={16} color={theme.muted}
          style={{ transform: abiertos[id] ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {abiertos[id] && contenido}
    </div>
  )

  return (
    <div style={{ ...css.card, padding: 0, overflow: 'hidden' }}>
      {['overdue', 'warn'].map(id => {
        const g = GRUPOS.find(x => x.id === id)
        return grupos[id].length > 0 && (
          <div key={id}>
            <GrupoTitulo label={g.label()} n={grupos[id].length} color={g.color()} mob />
            {grupos[id].map(fila)}
          </div>
        )
      })}
      {grupos.ok.length > 0 && plegable('ok', t('car.statOk'), theme.green, grupos.ok.length, grupos.ok.map(fila))}
      {grupos.empty.length > 0 && plegable('empty', t('maint.notLogged'), theme.rule, grupos.empty.length,
        <div style={{ paddingTop: 12 }}><Vacios items={grupos.empty} vehicleType={vehicleType} onAdd={onEdit} mob /></div>)}
    </div>
  )
}

/* ── La cifra que responde ──────────────────────────────────────
   En vez de cuatro recuadros que cuentan (6 · 2 · 2), lo que toca:
   la pieza más urgente y cuánto le queda. Si dos van a la par —el
   aceite y su filtro—, se dicen juntas. Los conteos se quedan en
   una barra con el estado de todas las piezas. */
function LeadStrip({ grupos, currentKm, vehicleType, mob }) {
  const apuntados = [...grupos.overdue, ...grupos.warn, ...grupos.ok]
  const primero = apuntados.find(x => x.record.next_km > 0 || x.record.next_date) || null
  const aLaPar = primero
    ? apuntados.filter(x => x.status === primero.status
        && Number(x.record.next_km || 0) === Number(primero.record.next_km || 0)
        && (x.record.next_date || '') === (primero.record.next_date || ''))
    : []
  const q = primero ? quedaDe(primero.record, primero.status, primero.progress) : null
  const n = { overdue: grupos.overdue.length, warn: grupos.warn.length, ok: grupos.ok.length, empty: grupos.empty.length }
  const total = n.overdue + n.warn + n.ok + n.empty
  const tramos = [
    { id: 'overdue', n: n.overdue, color: theme.red, label: t('car.statOverdue') },
    { id: 'warn', n: n.warn, color: theme.yellow, label: t('car.statWarn') },
    { id: 'ok', n: n.ok, color: theme.green, label: t('car.statOk') },
    { id: 'empty', n: n.empty, color: theme.border, dot: theme.rule, label: t('maint.notLogged') },
  ].filter(x => x.n > 0)
  const celda = { padding: mob ? '14px 16px' : '18px 22px', minWidth: 0 }
  const separa = mob ? { borderTop: `1px solid ${theme.border}` } : { borderLeft: `1px solid ${theme.border}` }
  const cifra = { ...css.num, fontSize: mob ? 24 : 30, fontWeight: 600, lineHeight: 1.1, marginTop: 6 }
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: mob ? '1fr' : 'minmax(0,1.6fr) minmax(0,1fr) minmax(0,1.3fr)',
      background: theme.card, border: `1px solid ${theme.border}`, marginBottom: mob ? 16 : 22,
    }}>
      <div style={celda}>
        <div style={css.lbl}>{t('car.nextUp')}</div>
        {q ? (
          <>
            <div style={{ ...cifra, color: q.color }}>
              {q.main}
              {q.sub && <span style={{ fontSize: 14, color: theme.muted, fontWeight: 500, marginLeft: 8 }}>{q.sub}</span>}
            </div>
            <div style={{ fontSize: 14, color: theme.text, marginTop: 6 }}>
              {aLaPar.map(x => maintName(x.mt, vehicleType)).join(' · ')}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 14, color: theme.muted, marginTop: 8 }}>{t('car.nextNone')}</div>
        )}
      </div>
      {/* En el móvil los km ya van en la cabecera. */}
      {!mob && (
        <div style={{ ...celda, ...separa }}>
          <div style={css.lbl}>{t('car.tabKm')}</div>
          <div style={{ ...cifra, color: theme.white }}>{fmtNum(currentKm)}</div>
        </div>
      )}
      <div style={{ ...celda, ...separa }}>
        <div style={css.lbl}>{t('car.healthOf', { n: total })}</div>
        <div style={{ display: 'flex', gap: 2, height: 10, margin: '12px 0 10px' }}>
          {tramos.map(x => <div key={x.id} style={{ flex: x.n, background: x.color }} />)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12.5, color: theme.muted }}>
          {tramos.map(x => (
            <span key={x.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <span style={{ width: 8, height: 8, background: x.dot || x.color }} />
              {x.label} <span style={{ ...css.num, color: theme.text }}>{x.n}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Modals ── */
function KmLogModal({ open, onClose, onSave, carKm }) {
  const [km, setKm] = useState(carKm || 0)
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const handleSave = async () => { setSaving(true); try { await onSave({ km, date, notes }) } finally { setSaving(false) } }
  return (
    <Modal open={open} onClose={onClose} title={t('car.logKmTitle')}>
      <Field label={t('car.tabKm')}><NumInput value={km} onChange={e => setKm(+e.target.value)} /></Field>
      <Field label={t('common.date')}><DateInput value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label={t('common.notes')}><input style={css.input} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('common.optional')} /></Field>
      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
        <button onClick={onClose} style={css.btnOutline}>{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving} style={css.btn()}><Save size={14} /> {saving ? t('common.saving') : t('common.save')}</button>
      </div>
    </Modal>
  )
}

/* Elegir qué se ha cambiado: los dos lados o uno solo. Lo elegido
   se marca con el acento, como todo lo elegido en la aplicación. */
function ScopePicker({ value, onChange }) {   // value null = ninguno
  const opciones = [
    { id: 'ambos', label: t('side.both') },
    { id: 'izq', label: sideLabel('izq') },
    { id: 'der', label: sideLabel('der') },
  ]
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      {opciones.map(o => {
        const activo = o.id === value
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)} style={{
            ...css.btn(activo ? theme.accent : theme.bg, activo ? theme.accentInk : theme.muted),
            flex: 1, justifyContent: 'center',
            border: `1px solid ${activo ? theme.accent : theme.border}`,
            padding: '10px 6px',
          }}>{o.label}</button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   El formulario de un mantenimiento

   Si la pieza va por eje y el vehículo es un coche, primero se dice
   qué lado se ha cambiado y después se rellena una sola vez: el km,
   la fecha, el coste y el taller. «Los dos» apunta lo mismo en los
   dos lados; un lado solo deja el otro como estaba.

   El próximo se calcula desde el lado que peor queda DESPUÉS del
   cambio: si cambias el izquierdo y el derecho sigue siendo el
   viejo, el aviso lo tiene que seguir mandando el derecho.
   ───────────────────────────────────────────────────────────── */
/* Se exporta solo para poder probarlo: que abrir esta ficha y
   guardar sin elegir lado NO toque los lados es la clase de fallo
   que hay que dejar clavada con un test. */
export function MaintModal({ open, onClose, onSave, onDelete, typeId, existing, currentKm, vehicleType, workshops = [], parts = [], onOpenPart }) {
  const confirmar = useConfirm()
  const mtype = MAINT_TYPES.find(x => x.id === typeId)
  const porLados = hasSides(mtype, vehicleType)
  const defKm = maintDefKm(mtype, vehicleType)
  const defMeses = maintDefMonths(mtype, vehicleType)

  /* Lo que ya hay guardado de cada lado: de aquí se parte, y solo se
     pisa el lado que diga el usuario. */
  const guardados = {
    izq: existing?.last_km_izq != null ? { km: existing.last_km_izq, date: existing.last_date_izq || '' } : null,
    der: existing?.last_km_der != null ? { km: existing.last_km_der, date: existing.last_date_der || '' } : null,
  }

  /* Si el eje ya tiene lados apuntados, se entra SIN ningún lado
     elegido. Abrir la ficha para enlazar un recambio o corregir el
     coste no puede reescribir los dos lados con la misma fecha:
     eso borraba el lado que se había cambiado aparte. Con los datos
     en blanco sí se arranca en «los dos», que es lo normal cuando
     se apunta por primera vez. */
  const yaTieneLados = porLados && hasSideData(existing)
  const [scope, setScope] = useState(yaTieneLados ? null : 'ambos')
  const [form, setForm] = useState({
    last_km: existing?.last_km ?? currentKm,
    last_date: existing?.last_date || '',
    next_km: existing?.next_km ?? (defKm ? currentKm + defKm : 0),
    next_date: existing?.next_date || '',
    cost: existing?.cost ?? 0,
    notes: existing?.notes || '',
    workshop_id: existing?.workshop_id || null,
    part_id: existing?.part_id || null,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  /* Los lados tal como quedarían con lo que hay escrito ahora. Sin
     lado elegido, los de antes: no se toca ninguno. */
  const ladosCon = (km, date, cual) => {
    const par = { km, date }
    if (!porLados) return { izq: par, der: null }
    if (!cual) return { ...guardados }
    return cual === 'ambos' ? { izq: par, der: par } : { ...guardados, [cual]: par }
  }

  const recalcular = (km, date, cual = scope) => {
    const lados = ladosCon(km, date, cual)
    const peor = worstOf([lados.izq, lados.der]) || { km, date }
    const siguiente = nextFrom(peor.km, peor.date, mtype, vehicleType)
    setForm(f => ({
      ...f, last_km: km, last_date: date,
      next_km: siguiente.next_km,
      next_date: siguiente.next_date || f.next_date,
    }))
  }

  /* Al cambiar de lado se traen los datos de ese lado, para no
     tener que volver a escribirlos. */
  const elegirScope = (cual) => {
    setScope(cual)
    const g = cual === 'ambos' ? worstOf([guardados.izq, guardados.der]) : guardados[cual]
    recalcular(g ? g.km : form.last_km, g ? g.date : form.last_date, cual)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const lados = ladosCon(form.last_km, form.last_date, scope)
      const peor = worstOf([lados.izq, lados.der]) || { km: form.last_km, date: form.last_date }
      await onSave({
        ...form,
        last_km: peor.km, last_date: peor.date || null,
        last_km_izq: porLados ? (lados.izq?.km ?? null) : null,
        last_date_izq: porLados ? (lados.izq?.date || null) : null,
        last_km_der: porLados ? (lados.der?.km ?? null) : null,
        last_date_der: porLados ? (lados.der?.date || null) : null,
      })
    } finally { setSaving(false) }
  }

  const recambio = parts.find(x => x.id === form.part_id) || null
  const hayGuardado = porLados && (guardados.izq || guardados.der)

  return (
    <Modal open={open} onClose={onClose} title={
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
        <MaintIcon id={typeId} size={17} />{maintName(mtype, vehicleType) || t('common.maintenance')}
      </span>
    }>
      <p style={{ ...css.subtitle, marginBottom: 16 }}>
        {t('car.interval')}: {defKm ? `${fmtNum(defKm)} km` : '—'}{defMeses ? t('car.everyMonths', { n: defMeses }) : ''}
      </p>

      {porLados && (
        <>
          <Field label={t('side.whatChanged')}>
            <ScopePicker value={scope} onChange={elegirScope} />
          </Field>
          {hayGuardado && (
            <div style={{ border: `1px solid ${theme.border}`, padding: '10px 12px', marginBottom: 14 }}>
              <span style={{ ...css.lbl, display: 'block', marginBottom: 6 }}>{t('car.lastLabel')}</span>
              <SideLines record={existing} color={colorEstado(getMaintStatus(existing, currentKm))} />
            </div>
          )}
          <p style={{ ...css.lbl, color: theme.mutedLight, marginTop: -6, marginBottom: 14, letterSpacing: '0.08em', textTransform: 'none', fontSize: 10.5 }}>
            {scope ? t('side.hint') : t('side.untouched')}
          </p>
        </>
      )}

      <ResponsiveGrid2>
        {/* Sin lado elegido no hay cambio que apuntar, así que los
            dos campos del último cambio se quedan quietos. */}
        <Field label={t('car.lastChange')}>
          <NumInput value={form.last_km} disabled={porLados && !scope}
            style={porLados && !scope ? { opacity: 0.45 } : null}
            onChange={e => recalcular(+e.target.value, form.last_date)} />
        </Field>
        <Field label={t('car.lastChangeDate')}>
          <DateInput value={form.last_date} disabled={porLados && !scope}
            style={porLados && !scope ? { opacity: 0.45 } : null}
            onChange={e => recalcular(form.last_km, e.target.value)} />
        </Field>
        <Field label={t('car.nextChange')}><NumInput value={form.next_km} onChange={e => set('next_km', +e.target.value)} /></Field>
        <Field label={t('car.nextChangeDate')}><DateInput value={form.next_date} onChange={e => set('next_date', e.target.value)} /></Field>
      </ResponsiveGrid2>
      <ResponsiveGrid2>
        <Field label={t('car.costEur')}><NumInput decimal value={form.cost} onChange={e => set('cost', +e.target.value)} /></Field>
        {/* Quién lo hizo. Es lo que permite luego sumar el gasto por
            taller; en blanco significa «no consta», no «ninguno». */}
        <Field label={t('car.workshop')}>
          <select style={css.select} value={form.workshop_id || ''}
            onChange={e => set('workshop_id', e.target.value || null)}>
            <option value="">{t('car.noWorkshop')}</option>
            {workshops.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
      </ResponsiveGrid2>

      {/* El recambio que lleva esta pieza. Va en el eje, no en el
          lado: delante y detrás pueden ser medidas distintas. */}
      <Field label={t('part.linked')}>
        {parts.length === 0 ? (
          <p style={{ ...css.lbl, color: theme.mutedLight, textTransform: 'none', letterSpacing: '0.04em', fontSize: 11 }}>
            {t('part.noneToLink')}
          </p>
        ) : (
          <>
            <select style={css.select} value={form.part_id || ''}
              onChange={e => set('part_id', e.target.value || null)}>
              <option value="">{t('part.none')}</option>
              {parts.map(x => <option key={x.id} value={x.id}>{x.reference ? `${x.name} — ${x.reference}` : x.name}</option>)}
            </select>
            {recambio && (
              <div style={{ marginTop: 8 }}>
                <PartChip part={recambio} onClick={onOpenPart} />
              </div>
            )}
          </>
        )}
      </Field>

      <Field label={t('common.notes')}>
        <input style={css.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={t('car.maintNotesPh')} />
      </Field>
      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
        {/* La papelera vivía en cada fila de la lista, al lado del
            lápiz: un toque mal dado y se iba lo apuntado. Ahora está
            aquí dentro, y pregunta. */}
        {existing && onDelete && (
          <button type="button" style={{ ...css.btnOutline, color: theme.red, marginRight: 'auto' }}
            onClick={async () => {
              if (!await confirmar(t('maint.deleteConfirm', { name: maintName(mtype, vehicleType) }))) return
              await onDelete()
            }}>
            <Trash2 size={13} /> {t('common.delete')}
          </button>
        )}
        <button onClick={onClose} style={css.btnOutline}>{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving} style={css.btn()}><Save size={14} /> {saving ? t('common.saving') : t('common.save')}</button>
      </div>
    </Modal>
  )
}

function CarEditModal({ open, onClose, onSave, car }) {
  const [form, setForm] = useState({ ...car })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = async () => { setSaving(true); try { await onSave(form) } finally { setSaving(false) } }
  return (
    <Modal open={open} onClose={onClose} title={t('car.editVehicle')}>
      <Field label={t('dash.type')}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          {VEHICLE_TYPES.map(v => (
            <button key={v.value} onClick={() => set('vehicle_type', v.value)} type="button" style={{
              ...css.btn(form.vehicle_type === v.value ? theme.accent : theme.bg, form.vehicle_type === v.value ? '#000' : theme.muted),
              flex: 1, justifyContent: 'center', border: `1px solid ${form.vehicle_type === v.value ? theme.accent : theme.border}`,
              fontSize: 14, padding: '10px 8px',
            }}>{v.emoji} {v.label}</button>
          ))}
        </div>
      </Field>
      <ResponsiveGrid2>
        <Field label={t('common.plate')}><input style={css.input} value={form.plate} onChange={e => set('plate', e.target.value)} /></Field>
        <Field label={t('dash.brand')}><input style={css.input} value={form.brand} onChange={e => set('brand', e.target.value)} /></Field>
        <Field label={t('dash.model')}><input style={css.input} value={form.model} onChange={e => set('model', e.target.value)} /></Field>
        <Field label={t('dash.year')}><NumInput value={form.year} onChange={e => set('year', +e.target.value)} /></Field>
        <Field label={t('dash.transmission')}>
          <select style={css.select} value={form.transmission} onChange={e => set('transmission', e.target.value)}>
            {TRANS_TYPES.map(v => <option key={v} value={v}>{transLabel(v)}</option>)}
          </select>
        </Field>
        <Field label={t('dash.fuel')}>
          <select style={css.select} value={form.fuel} onChange={e => set('fuel', e.target.value)}>
            {FUEL_TYPES.map(v => <option key={v} value={v}>{fuelLabel(v)}</option>)}
          </select>
        </Field>
      </ResponsiveGrid2>
      <Field label={t('common.notes')}><input style={css.input} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></Field>
      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
        <button onClick={onClose} style={css.btnOutline}>{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving} style={css.btn()}><Save size={14} /> {saving ? t('common.saving') : t('common.save')}</button>
      </div>
    </Modal>
  )
}

function PartFormModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', reference: '', url: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try { await onSave(form); setForm({ name: '', reference: '', url: '' }) } finally { setSaving(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={t('car.addPartTitle')}>
      <Field label={t('common.name')}><input style={css.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('car.partNamePh')} /></Field>
      <Field label={t('common.reference')}><input style={{ ...css.input, ...css.num }} value={form.reference} onChange={e => set('reference', e.target.value)} placeholder={t('car.partRefPh')} /></Field>
      <Field label={t('car.linkOptional')}><input style={css.input} value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." /></Field>
      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
        <button onClick={onClose} style={css.btnOutline}>{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving} style={css.btn()}><Save size={14} /> {saving ? t('common.saving') : t('common.save')}</button>
      </div>
    </Modal>
  )
}

/* En qué mantenimientos y en qué trabajos se está usando un
   recambio. Sirve para no borrar por error el que lleva puesto el
   coche y para llegar de un lado al otro. */
function usoDe(partId, maintenance = [], jobs = [], vehicleType) {
  const nombres = []
  maintenance.filter(m => m.part_id === partId).forEach(m => {
    const mt = MAINT_TYPES.find(x => x.id === m.type_id)
    nombres.push(mt ? maintName(mt, vehicleType) : m.type_id)
  })
  jobs.filter(j => j.part_id === partId).forEach(j => nombres.push(j.name))
  return nombres
}

/* ── Ficha de un recambio ── */
function PartDetailModal({ open, onClose, part, usos = [] }) {
  if (!part) return null
  return (
    <Modal open={open} onClose={onClose} title={t('part.detail')}>
      <h3 style={{ ...css.h3, marginBottom: 10 }}>{part.name}</h3>

      {part.reference && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ ...css.lbl, display: 'block', marginBottom: 5 }}>{t('common.reference')}</span>
          <span style={{ ...css.num, fontSize: 14, color: theme.white }}>{part.reference}</span>
        </div>
      )}

      {part.url && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ ...css.lbl, display: 'block', marginBottom: 5 }}>{t('common.link')}</span>
          <a href={part.url} target="_blank" rel="noopener noreferrer"
            style={{ color: theme.accent, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <ExternalLink size={12} /> {t('common.openLink')}
          </a>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12, marginTop: 4 }}>
        <span style={{ ...css.lbl, display: 'block', marginBottom: 6 }}>{t('part.usedIn')}</span>
        {usos.length === 0 ? (
          <span style={{ fontSize: 12.5, color: theme.mutedLight }}>{t('part.usedNowhere')}</span>
        ) : (
          <div style={{ display: 'grid', gap: 4 }}>
            {usos.map((nombre, i) => (
              <span key={i} style={{ fontSize: 13, color: theme.text, borderLeft: `3px solid ${theme.accent}`, paddingLeft: 8 }}>
                {nombre}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onClose} style={css.btnOutline}>{t('common.close')}</button>
      </div>
    </Modal>
  )
}

/* ── Trabajos libres ── */
function JobFormModal({ open, onClose, onSave, initial, carKm, workshops = [], parts = [] }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    date: initial?.date || today,
    km: initial?.km ?? carKm ?? 0,
    cost: initial?.cost ?? 0,
    workshop_id: initial?.workshop_id || null,
    part_id: initial?.part_id || null,
    notes: initial?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={initial ? t('job.edit') : t('job.new')}>
      <p style={{ ...css.subtitle, marginBottom: 16 }}>{t('job.hint')}</p>
      <Field label={t('job.one')}>
        <input style={css.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('job.namePh')} />
      </Field>
      <ResponsiveGrid2>
        <Field label={t('common.date')}><DateInput value={form.date} onChange={e => set('date', e.target.value)} /></Field>
        <Field label={t('car.tabKm')}><NumInput value={form.km} onChange={e => set('km', +e.target.value)} /></Field>
        <Field label={t('car.costEur')}><NumInput decimal value={form.cost} onChange={e => set('cost', +e.target.value)} /></Field>
        <Field label={t('car.workshop')}>
          <select style={css.select} value={form.workshop_id || ''} onChange={e => set('workshop_id', e.target.value || null)}>
            <option value="">{t('car.noWorkshop')}</option>
            {workshops.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
      </ResponsiveGrid2>
      <Field label={t('part.linked')}>
        {parts.length === 0 ? (
          <p style={{ ...css.lbl, color: theme.mutedLight, textTransform: 'none', letterSpacing: '0.04em', fontSize: 11 }}>
            {t('part.noneToLink')}
          </p>
        ) : (
          <select style={css.select} value={form.part_id || ''} onChange={e => set('part_id', e.target.value || null)}>
            <option value="">{t('part.none')}</option>
            {parts.map(x => <option key={x.id} value={x.id}>{x.reference ? `${x.name} — ${x.reference}` : x.name}</option>)}
          </select>
        )}
      </Field>
      <Field label={t('common.notes')}>
        <input style={css.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={t('common.optional')} />
      </Field>
      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
        <button onClick={onClose} style={css.btnOutline}>{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving} style={css.btn()}><Save size={14} /> {saving ? t('common.saving') : t('common.save')}</button>
      </div>
    </Modal>
  )
}

/* Lo que no está en la lista: una rótula, una soldadura, un pulido.
   Aquí no hay próximo ni aviso —es un cuaderno— pero el coste entra
   en los gastos y en lo gastado por taller como cualquier otro. */
function JobsTab({ jobs, workshops, parts, carKm, isMobile, onSave, onDelete, onOpenPart }) {
  const [editando, setEditando] = useState(null)   // 'nuevo' | el trabajo | null
  const total = jobs.reduce((n, j) => n + +(j.cost || 0), 0)
  const nombreTaller = (id) => workshops.find(w => w.id === id)?.name || null

  return (
    <>
      <div style={{ ...css.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ ...css.flexBetween, padding: isMobile ? '12px 14px' : '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
          <div>
            <h3 style={css.h3}><Hammer size={15} style={{ marginRight: 6 }} />{t('job.tab')}</h3>
            {jobs.length > 0 && (
              <span style={{ ...css.subtitle, display: 'block' }}>
                {jobs.length === 1 ? t('job.countOne') : t('job.count', { n: jobs.length })} · {fmtMoney(total)}
              </span>
            )}
          </div>
          <button onClick={() => setEditando('nuevo')} style={css.btnSm(theme.accent, theme.accentInk)}>
            <Plus size={12} /> {t('common.add')}
          </button>
        </div>

        {jobs.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Hammer size={32} color={theme.mutedLight} style={{ marginBottom: 8 }} />
            <p style={css.lbl}>{t('job.empty')}</p>
            <button onClick={() => setEditando('nuevo')} style={{ ...css.btn(), marginTop: 12 }}>
              <Plus size={14} /> {t('job.add')}
            </button>
          </div>
        ) : isMobile ? (
          <div style={{ padding: 10 }}>
            {jobs.map(j => {
              const recambio = parts.find(x => x.id === j.part_id)
              return (
                <div key={j.id} style={{ padding: '10px 4px', borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ ...css.flexBetween, gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{j.name}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <span style={{ ...css.num, fontSize: 11.5, color: theme.mutedLight }}>{formatDate(j.date)}</span>
                        <span style={{ ...css.num, fontSize: 11.5, color: theme.mutedLight }}>{fmtNum(j.km)} {t('common.km')}</span>
                        <span style={{ ...css.num, fontSize: 12.5, color: theme.white }}>{fmtMoney(j.cost)}</span>
                      </div>
                      {nombreTaller(j.workshop_id) && (
                        <div style={{ fontSize: 12, color: theme.muted, marginTop: 3 }}>{nombreTaller(j.workshop_id)}</div>
                      )}
                      {j.notes && <div style={{ fontSize: 12, color: theme.muted, marginTop: 3 }}>{j.notes}</div>}
                      {recambio && <div style={{ marginTop: 6 }}><PartChip part={recambio} onClick={onOpenPart} /></div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button onClick={() => setEditando(j)} style={css.btnSm(theme.accentSoft, theme.accent)}><Edit2 size={12} /></button>
                      <button onClick={() => onDelete(j.id)} style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {[t('job.one'), t('common.date'), t('car.tabKm'), t('common.cost'), t('car.workshop'), t('part.linked'), ''].map((h, i) => (
                    <th key={i} style={css.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => {
                  const recambio = parts.find(x => x.id === j.part_id)
                  return (
                    <tr key={j.id}
                      onMouseEnter={e => e.currentTarget.style.background = theme.cardHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...css.td, fontWeight: 600 }}>
                        {j.name}
                        {j.notes && <div style={{ fontSize: 11.5, color: theme.mutedLight, fontWeight: 400, marginTop: 2 }}>{j.notes}</div>}
                      </td>
                      <td style={{ ...css.td, ...css.num, color: theme.muted }}>{formatDate(j.date)}</td>
                      <td style={{ ...css.td, ...css.num, color: theme.muted }}>{fmtNum(j.km)}</td>
                      <td style={{ ...css.td, ...css.num, color: theme.white }}>{fmtMoney(j.cost)}</td>
                      <td style={{ ...css.td, color: theme.muted }}>{nombreTaller(j.workshop_id) || '—'}</td>
                      <td style={css.td}>{recambio ? <PartChip part={recambio} onClick={onOpenPart} /> : '—'}</td>
                      <td style={css.td}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setEditando(j)} style={css.btnSm(theme.accentSoft, theme.accent)}><Edit2 size={12} /></button>
                          <button onClick={() => onDelete(j.id)} style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editando && (
        <JobFormModal
          open={!!editando}
          initial={editando === 'nuevo' ? null : editando}
          carKm={carKm}
          workshops={workshops}
          parts={parts}
          onClose={() => setEditando(null)}
          onSave={async (form) => {
            await onSave(form, editando === 'nuevo' ? null : editando.id)
            setEditando(null)
          }}
        />
      )}
    </>
  )
}

/* ── Parts Tab ── */
function PartsTab({ carId, parts, maintenance = [], jobs = [], vehicleType, onAdd, onDelete, onOpenPart, isMobile }) {
  const [showAdd, setShowAdd] = useState(false)
  const blue = theme.accent, blueSoft = theme.accentSoft
  return (
    <>
      <div style={{ ...css.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ ...css.flexBetween, padding: isMobile ? '12px 14px' : '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
          <h3 style={css.h3}><Package size={15} style={{ marginRight: 6 }} />{t('car.tabParts')}</h3>
          <button onClick={() => setShowAdd(true)} style={css.btnSm(theme.accent, '#000')}><Plus size={12} /> {t('common.add')}</button>
        </div>
        {parts.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Package size={32} color={theme.mutedLight} style={{ marginBottom: 8 }} />
            <p style={css.lbl}>{t('car.noParts')}</p>
            <button onClick={() => setShowAdd(true)} style={{ ...css.btn(), marginTop: 12 }}><Plus size={14} /> {t('car.addPart')}</button>
          </div>
        ) : isMobile ? (
          /* Mobile: card list */
          <div style={{ padding: 10 }}>
            {parts.map(p => {
              const usos = usoDe(p.id, maintenance, jobs, vehicleType)
              return (
                <div key={p.id} onClick={() => onOpenPart?.(p)}
                  style={{ padding: '10px 4px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                      {p.reference && <span style={css.badge(blueSoft, blue)}>{p.reference}</span>}
                      {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: blue, fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}><ExternalLink size={11} /> {t('common.link')}</a>}
                    </div>
                    {usos.length > 0 && (
                      <div style={{ ...css.lbl, marginTop: 5, textTransform: 'none', letterSpacing: '0.04em', fontSize: 11, color: theme.muted }}>
                        {t('part.usedIn')}: {usos.join(' · ')}
                      </div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); onDelete(p.id) }} style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button>
                </div>
              )
            })}
          </div>
        ) : (
          /* Desktop: table */
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <th style={css.th}>{t('common.name')}</th><th style={css.th}>{t('common.reference')}</th><th style={css.th}>{t('part.usedIn')}</th><th style={css.th}>{t('common.link')}</th><th style={{ ...css.th, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {parts.map(p => {
                const usos = usoDe(p.id, maintenance, jobs, vehicleType)
                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${theme.border}`, cursor: 'pointer' }}
                    onClick={() => onOpenPart?.(p)}
                    onMouseEnter={e => e.currentTarget.style.background = theme.cardHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...css.td, fontWeight: 600 }}>{p.name}</td>
                    <td style={css.td}>{p.reference ? <span style={css.badge(blueSoft, blue)}>{p.reference}</span> : <span style={{ color: theme.mutedLight, fontSize: 12 }}>—</span>}</td>
                    <td style={{ ...css.td, color: theme.muted, fontSize: 12 }}>{usos.length ? usos.join(' · ') : '—'}</td>
                    <td style={css.td}>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: blue, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}><ExternalLink size={12} /> {t('common.openLink')}</a> : <span style={{ color: theme.mutedLight, fontSize: 12 }}>—</span>}</td>
                    <td style={css.td}><button onClick={e => { e.stopPropagation(); onDelete(p.id) }} style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <PartFormModal open={showAdd} onClose={() => setShowAdd(false)} onSave={async (form) => { await onAdd(form); setShowAdd(false) }} />
    </>
  )
}

/* ── Main CarDetail ── */
export default function CarDetail({ car: initialCar, onBack, onCarUpdated, onToast }) {
  useLang()
  const mob = useIsMobile()
  const [car, setCar] = useState(initialCar)
  const [maintenance, setMaintenance] = useState([])
  const [kmLogs, setKmLogs] = useState([])
  const [parts, setParts] = useState([])
  const [fuelLogs, setFuelLogs] = useState([])
  const [itvRecords, setItvRecords] = useState([])
  const [todos, setTodos] = useState([])
  const [jobs, setJobs] = useState([])
  const [workshops, setWorkshops] = useState([])
  const [partDetail, setPartDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showKmModal, setShowKmModal] = useState(false)
  const [editMaintType, setEditMaintType] = useState(null)
  const [showEditCar, setShowEditCar] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [activeTab, setActiveTab] = useState('maint')

  const loadData = async () => {
    try {
      const [maint, logs, carParts, fuel, itv, todoList, wsh, jobList] = await Promise.all([getMaintenanceRecords(car.id), getKmLogs(car.id), getCarParts(car.id), getFuelLogs(car.id), getItvRecords(car.id), getVehicleTodos(car.id), getWorkshops(), getCustomJobs(car.id)])
      setMaintenance(maint); setKmLogs(logs); setParts(carParts); setFuelLogs(fuel); setItvRecords(itv); setTodos(todoList); setWorkshops(wsh); setJobs(jobList)
    } catch (err) { onToast(t('car.loadError') + err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [car.id])

  /* Deslizar desde el borde izquierdo vuelve al listado, como en iOS.
     Va aquí arriba a propósito: los hooks tienen que ejecutarse
     siempre, y más abajo hay un return temprano por la carga. */
  useEdgeBack(onBack)

  /* A partir del iPad mini de lado, la ITV, las tareas y el gasto
     se van a una columna fija que no cambia al cambiar de pestaña. */
  const { two } = useTwoCol()

  /* Los mantenimientos repartidos por lo que toca. De aquí salen la
     franja de arriba y la lista, así que las dos cuentan lo mismo. */
  const grupos = useMemo(
    () => agrupar(getMaintenanceForVehicle(car.vehicle_type, car.fuel), maintenance, car.current_km),
    [maintenance, car.current_km, car.vehicle_type, car.fuel])

  const handleSaveKm = async (data) => {
    try {
      await createKmLog({ car_id: car.id, km: data.km, date: data.date, notes: data.notes })
      const updated = await updateCar(car.id, { current_km: data.km })
      setCar(updated)
      setShowKmModal(false); onToast(t('car.kmLogged')); loadData()
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }
  const handleDeleteKm = async (logId) => {
    try {
      await deleteKmLog(logId)
      // Recalculate current_km from remaining logs
      const remaining = kmLogs.filter(l => l.id !== logId)
      if (remaining.length > 0) {
        const sorted = [...remaining].sort((a, b) => new Date(b.date) - new Date(a.date))
        const latest = sorted[0]
        const updated = await updateCar(car.id, { current_km: latest.km })
        setCar(updated)
      }
      onToast(t('car.recordDeleted')); loadData()
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }
  const handleSaveMaint = async (typeId, formData) => {
    try { await upsertMaintenanceRecord({ car_id: car.id, type_id: typeId, ...formData }); setEditMaintType(null); onToast(t('car.maintUpdated')); loadData() }
    catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }
  const handleDeleteMaint = async (typeId) => {
    try { await deleteMaintenanceRecord(car.id, typeId); onToast(t('car.recordDeleted')); loadData() }
    catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }
  const handleAddPart = async (form) => {
    try { await createCarPart({ car_id: car.id, ...form }); onToast(t('car.partAdded')); loadData() }
    catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }
  const handleDeletePart = async (id) => {
    try { await deleteCarPart(id); setPartDetail(null); onToast(t('car.partDeleted')); loadData() }
    catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }
  /* Trabajos libres: el mismo formulario crea y edita, así que aquí
     se decide por si llega o no un id. */
  const handleSaveJob = async (form, id) => {
    try {
      if (id) { await updateCustomJob(id, form); onToast(t('job.updated')) }
      else { await createCustomJob({ car_id: car.id, ...form }); onToast(t('job.added')) }
      loadData()
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }
  const handleDeleteJob = async (id) => {
    try { await deleteCustomJob(id); onToast(t('job.deleted')); loadData() }
    catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }
  const handleEditCar = async (form) => {
    try {
      const updated = await updateCar(car.id, { plate: form.plate, brand: form.brand, model: form.model, year: form.year, transmission: form.transmission, fuel: form.fuel, notes: form.notes, vehicle_type: form.vehicle_type || 'coche' })
      setCar(updated); setShowEditCar(false); onToast(t('car.updated'))
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  if (loading) return <Loader text={t('common.loading')} />

  const pendingTodos = todos.filter(t => !t.completed).length
  const detailTabs = [
    { id: 'maint', icon: <Wrench size={14} />, label: mob ? t('car.tabMaintShort') : t('car.tabMaint') },
    { id: 'todos', icon: <CheckSquare size={14} />, label: t('car.tabTodos'), badge: pendingTodos > 0 ? pendingTodos : null },
    { id: 'parts', icon: <Package size={14} />, label: t('car.tabParts') },
    { id: 'jobs', icon: <Hammer size={14} />, label: t('job.tab') },
    { id: 'fuel', icon: <Fuel size={14} />, label: mob ? t('car.tabFuelShort') : t('car.tabFuel') },
    { id: 'expenses', icon: <Euro size={14} />, label: t('car.tabExpenses') },
    { id: 'km', icon: <TrendingUp size={14} />, label: mob ? t('car.tabKmShort') : t('car.tabKm') },
  ]

  const tabIndex = Math.max(0, detailTabs.findIndex(t => t.id === activeTab))

  return (
    <div style={{ paddingTop: mob ? 16 : 24, paddingBottom: 40 }}>
      <button onClick={onBack} style={{ ...css.btnOutline, marginBottom: 16, padding: mob ? '6px 12px' : '8px 16px' }}><ChevronLeft size={14} /> {t('common.back')}</button>

      {/* Header */}
      <div style={{ ...css.card, padding: mob ? 16 : 22, marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: mob ? 'column' : 'row', justifyContent: 'space-between', gap: mob ? 12 : 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <h2 style={{ ...css.h1, fontSize: mob ? 22 : 28 }}>{car.brand} {car.model}</h2>
              <span style={css.badge(theme.accentSoft, theme.accent)}>{car.plate}</span>
            </div>
            <div style={{ display: 'flex', gap: mob ? 10 : 16, marginTop: 6, flexWrap: 'wrap', fontSize: mob ? 12 : 13 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: theme.muted }}>
                {car.vehicle_type === 'moto' ? <Bike size={13} /> : <Car size={13} />} {VEHICLE_TYPES.find(v => v.value === (car.vehicle_type || 'coche'))?.label}
              </span>
              {mob && <span style={{ ...css.num, display: 'flex', alignItems: 'center', color: theme.white }}>{fmtNum(car.current_km)} {t('common.km')}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: theme.muted }}><Calendar size={13} /> {car.year}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: theme.muted }}><Settings size={13} /> {transLabel(car.transmission)}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: theme.muted }}><Fuel size={13} /> {fuelLabel(car.fuel)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignSelf: mob ? 'stretch' : 'flex-start' }}>
            <button onClick={() => setShowKmModal(true)} style={{ ...css.btn(), flex: mob ? 1 : 'none', justifyContent: 'center' }}>
              <TrendingUp size={14} /> {mob ? t('car.tabKmShort') : t('car.logKm')}
            </button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowExportMenu(!showExportMenu)}
                style={{ ...css.btnOutline, color: theme.muted }} title={t('car.export')} aria-label={t('car.export')}>
                <FileDown size={14} />
              </button>
              {showExportMenu && (
                <>
                  <div onClick={() => setShowExportMenu(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 6,
                    background: theme.card, border: `1px solid ${theme.border}`,
                    borderRadius: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    zIndex: 51, minWidth: 180, overflow: 'hidden',
                  }}>
                    <button onClick={() => {
                      setShowExportMenu(false)
                      exportCarPdf({ car, maintenance, kmLogs, fuelLogs, parts, itvRecords, todos, jobs })
                    }} style={{
                      width: '100%', background: 'transparent', border: 'none',
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                      color: theme.text, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                      textAlign: 'left',
                    }}>
                      <FileText size={16} color={theme.red} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{t('car.exportPdf')}</div>
                        <div style={css.lbl}>{t('car.fullReport')}</div>
                      </div>
                    </button>
                    <div style={{ height: 1, background: theme.border }} />
                    <button onClick={async () => {
                      setShowExportMenu(false)
                      try {
                        await exportCarExcel({ car, maintenance, kmLogs, fuelLogs, parts, itvRecords, todos, jobs })
                      } catch (err) {
                        onToast(t('car.exportXlsErr') + err.message, 'error')
                      }
                    }} style={{
                      width: '100%', background: 'transparent', border: 'none',
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                      color: theme.text, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                      textAlign: 'left',
                    }}>
                      <FileSpreadsheet size={16} color={theme.green} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{t('car.exportExcel')}</div>
                        <div style={css.lbl}>{t('car.sheetData')}</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setShowEditCar(true)} style={css.btnOutline} aria-label={t('car.editVehicle')}><Edit2 size={14} /></button>
          </div>
        </div>
      </div>

      <LeadStrip grupos={grupos} currentKm={car.current_km} vehicleType={car.vehicle_type} mob={mob} />

      {/* En estrecho la ITV se queda donde estaba, antes de las
          pestañas. En ancho se va a la columna. */}
      {!two && (
        <ItvCard carId={car.id} itvRecords={itvRecords} onReload={loadData} onToast={onToast} isMobile={mob} />
      )}

      {/* La columna no se repite en estrecho: ahí las tareas y el
          gasto ya están a un toque, en sus pestañas. */}
      <TwoColumn narrow="hide" context={two ? (
        <>
          <ItvCard carId={car.id} itvRecords={itvRecords} onReload={loadData} onToast={onToast} isMobile dense />

          <Panel
            title={t('car.tabTodos')}
            right={pendingTodos > 0 ? pendingTodos : null}
            onClick={() => setActiveTab('todos')}
          >
            <AttentionList
              empty={t('todo.empty')}
              items={todos.filter(x => !x.completed).slice(0, 4).map(x => ({
                key: x.id,
                title: x.title,
                sub: x.notes || null,
                color: x.priority === 'alta' ? theme.red : x.priority === 'baja' ? theme.green : theme.yellow,
              }))}
            />
          </Panel>

          <Panel title={t('car.tabExpenses')} pad={0} right={t('common.months12')}>
            <SpendChart maintenance={maintenance} fuelLogs={fuelLogs} jobs={jobs} />
          </Panel>
        </>
      ) : null}>

      {/* Tabs */}
      <TabBar tabs={detailTabs} active={activeTab} onChange={setActiveTab} isMobile={mob} />

      {/* El contenido de las pestañas se desliza en táctil */}
      <SwipeArea index={tabIndex} count={detailTabs.length}
        onChange={i => setActiveTab(detailTabs[i].id)}>
        {/* Maintenance Tab */}
        {activeTab === 'maint' && (
          mob
            ? <MaintListMobile grupos={grupos} vehicleType={car.vehicle_type} onEdit={setEditMaintType} />
            : <MaintTable grupos={grupos} vehicleType={car.vehicle_type} parts={parts}
                onEdit={setEditMaintType} onOpenPart={setPartDetail} />
        )}

        {/* Parts Tab */}
        {activeTab === 'todos' && <TodoTab carId={car.id} todos={todos} onReload={loadData} onToast={onToast} isMobile={mob} />}

        {activeTab === 'parts' && <PartsTab carId={car.id} parts={parts} maintenance={maintenance} jobs={jobs}
          vehicleType={car.vehicle_type} onAdd={handleAddPart} onDelete={handleDeletePart}
          onOpenPart={setPartDetail} isMobile={mob} />}

        {activeTab === 'jobs' && <JobsTab jobs={jobs} workshops={workshops} parts={parts}
          carKm={car.current_km} isMobile={mob}
          onSave={handleSaveJob} onDelete={handleDeleteJob} onOpenPart={setPartDetail} />}

        {/* Fuel Tab */}
        {activeTab === 'fuel' && <FuelTab carId={car.id} carKm={car.current_km} fuelLogs={fuelLogs} onReload={loadData} onToast={onToast} isMobile={mob}
          onKmUpdate={async (km) => {
            const updated = await updateCar(car.id, { current_km: km })
            setCar(updated)
          }}
        />}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && <ExpenseTab maintenance={maintenance} fuelLogs={fuelLogs} jobs={jobs}
          vehicleType={car.vehicle_type} isMobile={mob} currentKm={car.current_km} />}

        {/* KM History Tab */}
        {activeTab === 'km' && (
          <div style={{ ...css.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ ...css.flexBetween, padding: mob ? '12px 14px' : '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
              <h3 style={css.h3}><TrendingUp size={15} style={{ marginRight: 6 }} />{t('car.tabKm')}</h3>
              <button onClick={() => setShowKmModal(true)} style={css.btnSm(theme.accent, '#000')}><Plus size={12} /> {t('common.register')}</button>
            </div>
            {kmLogs.length === 0 ? (
              <p style={{ ...css.lbl, padding: 20, textAlign: 'center' }}>{t('car.noRecords')}</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                      {[t('common.date'), t('car.tabKm'), t('common.notes'), ''].map((h, i) => <th key={i} style={css.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {kmLogs.map(l => (
                      <tr key={l.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ ...css.td, fontSize: mob ? 12 : 13 }}>{formatDate(l.date)}</td>
                        <td style={{ ...css.td, fontWeight: 700 }}>{l.km.toLocaleString()} km</td>
                        <td style={{ ...css.td, color: theme.muted, fontSize: mob ? 12 : 13 }}>{l.notes || '—'}</td>
                        <td style={css.td}>
                          <button onClick={() => handleDeleteKm(l.id)} style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </SwipeArea>
      </TwoColumn>

      {/* Modals */}
      <KmLogModal open={showKmModal} onClose={() => setShowKmModal(false)} onSave={handleSaveKm} carKm={car.current_km} />
      {editMaintType && (
        <MaintModal open={!!editMaintType} onClose={() => setEditMaintType(null)} typeId={editMaintType}
          existing={maintenance.find(x => x.type_id === editMaintType) || null}
          workshops={workshops} parts={parts} vehicleType={car.vehicle_type}
          onOpenPart={setPartDetail}
          onDelete={async () => { await handleDeleteMaint(editMaintType); setEditMaintType(null) }}
          currentKm={car.current_km} onSave={data => handleSaveMaint(editMaintType, data)} />
      )}
      <PartDetailModal open={!!partDetail} part={partDetail} onClose={() => setPartDetail(null)}
        usos={partDetail ? usoDe(partDetail.id, maintenance, jobs, car.vehicle_type) : []} />
      <CarEditModal open={showEditCar} onClose={() => setShowEditCar(false)} car={car} onSave={handleEditCar} />
    </div>
  )
}
