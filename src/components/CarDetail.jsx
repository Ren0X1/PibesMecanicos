import { useState, useEffect, useMemo } from 'react'
import {
  Wrench, Edit2, Trash2, ChevronLeft, Gauge, Calendar,
  Fuel, Settings, TrendingUp, Save, AlertTriangle, CheckCircle,
  Clock, Plus, Package, ExternalLink, FileDown, Euro, CheckSquare, FileText, FileSpreadsheet
} from 'lucide-react'
import { theme, css } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import {
  updateCar, getMaintenanceRecords, upsertMaintenanceRecord,
  deleteMaintenanceRecord, getKmLogs, createKmLog, deleteKmLog,
  getCarParts, createCarPart, deleteCarPart, getFuelLogs, getItvRecords, getVehicleTodos, getWorkshops
} from '../lib/api.js'
import { MAINT_TYPES, FUEL_TYPES, TRANS_TYPES, VEHICLE_TYPES, getMaintStatus, formatDate, getMaintenanceForVehicle, fuelLabel, transLabel } from '../lib/constants.js'
import { Modal, Field, Stat, StatusBadge, Loader, ResponsiveGrid2, DateInput, NumInput } from './ui.jsx'
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
  // On mobile, lay tabs out in a grid so they're ALL visible (no horizontal scroll).
  // <=4 tabs -> single row; more -> 3 columns wrapping into rows.
  const cols = tabs.length <= 4 ? tabs.length : 3
  return (
    <div style={{
      marginBottom: 16, background: theme.bg, borderRadius: 0, padding: 4,
      ...(isMobile
        ? { display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4 }
        : { display: 'flex', gap: 4 }),
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6,
          flex: isMobile ? undefined : 1, justifyContent: 'center',
          background: active === t.id ? theme.card : 'transparent',
          color: active === t.id ? theme.white : theme.muted,
          border: active === t.id ? `1px solid ${theme.border}` : '1px solid transparent',
          borderRadius: 0, padding: isMobile ? '9px 6px' : '9px 16px', cursor: 'pointer', fontWeight: 600,
          fontSize: isMobile ? 12 : 13, fontFamily: 'inherit', transition: 'all .15s', position: 'relative',
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
function MaintCard({ mt, record, currentKm, onEdit, onDelete }) {
  const status = record ? getMaintStatus(record, currentKm) : null
  return (
    <div onClick={onEdit}
      style={{ ...css.card, padding: 14, marginBottom: 8, cursor: 'pointer' }}
      onTouchEnd={e => { /* prevent ghost click */ }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>{mt.emoji}</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{mt.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {status ? <StatusBadge status={status} /> : <span style={css.lbl}>{t('common.noData')}</span>}
        </div>
      </div>
      {record && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12, color: theme.muted }}>
          <span>{t('car.lastLabel')}: {fmtNum(record.last_km)} {t('common.km')}</span>
          <span>{t('car.dateLabel')}: {formatDate(record.last_date) || '—'}</span>
          <span style={{ fontWeight: 600, color: theme.text }}>{t('car.nextLabel')}: {fmtNum(record.next_km)} {t('common.km')}</span>
          <span>{t('car.dateLabel')}: {formatDate(record.next_date) || '—'}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
        <button onClick={e => { e.stopPropagation(); onEdit() }} style={css.btnSm(theme.accentSoft, theme.accent)}><Edit2 size={12} /></button>
        {record && <button onClick={e => { e.stopPropagation(); onDelete() }} style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button>}
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

function MaintModal({ open, onClose, onSave, typeId, existing, currentKm, workshops = [] }) {
  const mtype = MAINT_TYPES.find(t => t.id === typeId)
  const [form, setForm] = useState(existing || {
    last_km: currentKm, last_date: '',
    next_km: currentKm + (mtype?.defKm || 10000), next_date: '', cost: 0, notes: '',
    workshop_id: null,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const autoCalcNext = (lastKm, lastDate) => {
    if (!mtype) return
    const nk = lastKm + mtype.defKm
    let nd = form.next_date
    if (lastDate && mtype.defMonths) { const d = new Date(lastDate); d.setMonth(d.getMonth() + mtype.defMonths); nd = d.toISOString().split('T')[0] }
    setForm(f => ({ ...f, last_km: lastKm, last_date: lastDate, next_km: nk, next_date: nd }))
  }
  const handleSave = async () => { setSaving(true); try { await onSave(form) } finally { setSaving(false) } }
  return (
    <Modal open={open} onClose={onClose} title={`${mtype?.emoji || '🔧'} ${mtype?.name || t('common.maintenance')}`}>
      <p style={{ ...css.subtitle, marginBottom: 16 }}>
        {t('car.interval')}: {mtype?.defKm ? `${fmtNum(mtype.defKm)} km` : '—'}{mtype?.defMonths ? t('car.everyMonths', { n: mtype.defMonths }) : ''}
      </p>
      <ResponsiveGrid2>
        <Field label={t('car.lastChange')}><NumInput value={form.last_km} onChange={e => autoCalcNext(+e.target.value, form.last_date)} /></Field>
        <Field label={t('car.lastChangeDate')}><DateInput value={form.last_date} onChange={e => autoCalcNext(form.last_km, e.target.value)} /></Field>
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
      <Field label={t('common.notes')}>
        <input style={css.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={t('car.maintNotesPh')} />
      </Field>
      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
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

/* ── Parts Tab ── */
function PartsTab({ carId, parts, onAdd, onDelete, isMobile }) {
  const [showAdd, setShowAdd] = useState(false)
  const blue = theme.accent, blueSoft = 'rgba(59,130,246,0.12)'
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
            {parts.map(p => (
              <div key={p.id} style={{ padding: '10px 4px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    {p.reference && <span style={css.badge(blueSoft, blue)}>{p.reference}</span>}
                    {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: blue, fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}><ExternalLink size={11} /> {t('common.link')}</a>}
                  </div>
                </div>
                <button onClick={() => onDelete(p.id)} style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop: table */
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <th style={css.th}>{t('common.name')}</th><th style={css.th}>{t('common.reference')}</th><th style={css.th}>{t('common.link')}</th><th style={{ ...css.th, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {parts.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${theme.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = theme.cardHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...css.td, fontWeight: 600 }}>{p.name}</td>
                  <td style={css.td}>{p.reference ? <span style={css.badge(blueSoft, blue)}>{p.reference}</span> : <span style={{ color: theme.mutedLight, fontSize: 12 }}>—</span>}</td>
                  <td style={css.td}>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: blue, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}><ExternalLink size={12} /> {t('common.openLink')}</a> : <span style={{ color: theme.mutedLight, fontSize: 12 }}>—</span>}</td>
                  <td style={css.td}><button onClick={() => onDelete(p.id)} style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button></td>
                </tr>
              ))}
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
  const [workshops, setWorkshops] = useState([])
  const [loading, setLoading] = useState(true)
  const [showKmModal, setShowKmModal] = useState(false)
  const [editMaintType, setEditMaintType] = useState(null)
  const [showEditCar, setShowEditCar] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [activeTab, setActiveTab] = useState('maint')

  const loadData = async () => {
    try {
      const [maint, logs, carParts, fuel, itv, todoList, wsh] = await Promise.all([getMaintenanceRecords(car.id), getKmLogs(car.id), getCarParts(car.id), getFuelLogs(car.id), getItvRecords(car.id), getVehicleTodos(car.id), getWorkshops()])
      setMaintenance(maint); setKmLogs(logs); setParts(carParts); setFuelLogs(fuel); setItvRecords(itv); setTodos(todoList); setWorkshops(wsh)
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

  const stats = useMemo(() => {
    let ok = 0, warn = 0, overdue = 0
    maintenance.forEach(m => { const s = getMaintStatus(m, car.current_km); if (s === 'ok') ok++; else if (s === 'warn') warn++; else overdue++ })
    return { ok, warn, overdue }
  }, [maintenance, car.current_km])

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
    try { await deleteCarPart(id); onToast(t('car.partDeleted')); loadData() }
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
    { id: 'fuel', icon: <Fuel size={14} />, label: mob ? t('car.tabFuelShort') : t('car.tabFuel') },
    { id: 'expenses', icon: <Euro size={14} />, label: t('car.tabExpenses') },
    { id: 'km', icon: <TrendingUp size={14} />, label: mob ? t('car.tabKmShort') : t('car.tabKm') },
  ]

  const tabIndex = Math.max(0, detailTabs.findIndex(t => t.id === activeTab))

  return (
    <div style={{ paddingTop: mob ? 16 : 24, paddingBottom: 40 }}>
      <button onClick={onBack} style={{ ...css.btnOutline, marginBottom: 16, padding: mob ? '6px 12px' : '8px 16px' }}><ChevronLeft size={14} /> {t('common.back')}</button>

      {/* Header */}
      <div style={{ ...css.card, padding: mob ? 16 : 24, marginBottom: 16, background: `linear-gradient(135deg, ${theme.card} 0%, #2e2a1a 100%)` }}>
        <div style={{ display: 'flex', flexDirection: mob ? 'column' : 'row', justifyContent: 'space-between', gap: mob ? 12 : 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <h2 style={{ ...css.h1, fontSize: mob ? 22 : 28 }}>{car.vehicle_type === 'moto' ? '🏍️' : '🚗'} {car.brand} {car.model}</h2>
              <span style={css.badge(theme.accentSoft, theme.accent)}>{car.plate}</span>
            </div>
            <div style={{ display: 'flex', gap: mob ? 10 : 16, marginTop: 6, flexWrap: 'wrap', fontSize: mob ? 12 : 13 }}>
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
                style={{ ...css.btnOutline, color: theme.muted, borderColor: 'rgba(139,92,246,0.3)' }} title={t('car.export')}>
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
                      exportCarPdf({ car, maintenance, kmLogs, fuelLogs, parts, itvRecords, todos })
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
                        await exportCarExcel({ car, maintenance, kmLogs, fuelLogs, parts, itvRecords, todos })
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
            <button onClick={() => setShowEditCar(true)} style={css.btnOutline}><Edit2 size={14} /></button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: mob ? 8 : 12, marginBottom: mob ? 16 : 24 }}>
        <Stat icon={<Gauge size={15} />} label={t('car.tabKm')} value={fmtNum(car.current_km)} />
        <Stat icon={<CheckCircle size={15} />} label={t('car.statOk')} value={stats.ok} color={theme.green} />
        <Stat icon={<Clock size={15} />} label={t('car.statWarn')} value={stats.warn} color={theme.yellow} />
        <Stat icon={<AlertTriangle size={15} />} label={t('car.statOverdue')} value={stats.overdue} color={theme.red} />
      </div>

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
            <SpendChart maintenance={maintenance} fuelLogs={fuelLogs} />
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
          mob ? (
            /* Mobile: card list */
            <div>
              {getMaintenanceForVehicle(car.vehicle_type, car.fuel).map(mt => {
                const m = maintenance.find(x => x.type_id === mt.id)
                return <MaintCard key={mt.id} mt={mt} record={m} currentKm={car.current_km}
                  onEdit={() => setEditMaintType(mt.id)} onDelete={() => handleDeleteMaint(mt.id)} />
              })}
            </div>
          ) : (
            /* Desktop: table */
            <div style={{ ...css.card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
                <h3 style={css.h3}><Wrench size={15} style={{ marginRight: 6 }} />{t('car.tabMaint')}</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                      {[t('car.element'), t('common.state'), t('car.lastKm'), t('car.lastDate'), t('car.nextKm'), t('car.nextDate'), t('common.cost'), ''].map((h, i) => <th key={i} style={css.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {getMaintenanceForVehicle(car.vehicle_type, car.fuel).map(mt => {
                      const m = maintenance.find(x => x.type_id === mt.id)
                      const status = m ? getMaintStatus(m, car.current_km) : null
                      return (
                        <tr key={mt.id} style={{ borderBottom: `1px solid ${theme.border}`, cursor: 'pointer' }}
                          onClick={() => setEditMaintType(mt.id)}
                          onMouseEnter={e => e.currentTarget.style.background = theme.cardHover}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ ...css.td, fontWeight: 600 }}>{mt.emoji} {mt.name}</td>
                          <td style={css.td}>{status ? <StatusBadge status={status} /> : <span style={css.lbl}>{t('common.noData')}</span>}</td>
                          <td style={{ ...css.td, color: theme.muted }}>{m ? m.last_km.toLocaleString() : '—'}</td>
                          <td style={{ ...css.td, color: theme.muted }}>{formatDate(m?.last_date)}</td>
                          <td style={{ ...css.td, fontWeight: 600 }}>{m ? m.next_km.toLocaleString() : '—'}</td>
                          <td style={{ ...css.td, color: theme.muted }}>{formatDate(m?.next_date)}</td>
                          <td style={{ ...css.td, color: theme.muted }}>{m?.cost ? `${m.cost}€` : '—'}</td>
                          <td style={css.td}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={e => { e.stopPropagation(); setEditMaintType(mt.id) }} style={css.btnSm(theme.accentSoft, theme.accent)}><Edit2 size={12} /></button>
                              {m && <button onClick={e => { e.stopPropagation(); handleDeleteMaint(mt.id) }} style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* Parts Tab */}
        {activeTab === 'todos' && <TodoTab carId={car.id} todos={todos} onReload={loadData} onToast={onToast} isMobile={mob} />}

        {activeTab === 'parts' && <PartsTab carId={car.id} parts={parts} onAdd={handleAddPart} onDelete={handleDeletePart} isMobile={mob} />}

        {/* Fuel Tab */}
        {activeTab === 'fuel' && <FuelTab carId={car.id} carKm={car.current_km} fuelLogs={fuelLogs} onReload={loadData} onToast={onToast} isMobile={mob}
          onKmUpdate={async (km) => {
            const updated = await updateCar(car.id, { current_km: km })
            setCar(updated)
          }}
        />}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && <ExpenseTab maintenance={maintenance} fuelLogs={fuelLogs} isMobile={mob} currentKm={car.current_km} />}

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
          existing={(() => { const m = maintenance.find(x => x.type_id === editMaintType); return m ? { last_km: m.last_km, last_date: m.last_date, next_km: m.next_km, next_date: m.next_date, cost: m.cost, notes: m.notes, workshop_id: m.workshop_id || null } : null })()}
          workshops={workshops}
          currentKm={car.current_km} onSave={data => handleSaveMaint(editMaintType, data)} />
      )}
      <CarEditModal open={showEditCar} onClose={() => setShowEditCar(false)} car={car} onSave={handleEditCar} />
    </div>
  )
}
