import { useState, useEffect } from 'react'
import { ShieldCheck, ShieldAlert, ShieldX, Plus, Edit2, Trash2, Save, Calendar } from 'lucide-react'
import { theme, css } from '../lib/theme.js'
import { formatDate } from '../lib/constants.js'
import { createItvRecord, updateItvRecord, deleteItvRecord } from '../lib/api.js'
import { Modal, Field, ResponsiveGrid2, DateInput, NumInput } from './ui.jsx'

const RESULTS = [
  { value: 'favorable', label: 'Favorable', color: theme.green, desc: 'Sin defectos' },
  { value: 'desfavorable', label: 'Desfavorable', color: theme.yellow, desc: 'Defectos leves — plazo para reparar' },
  { value: 'negativa', label: 'Negativa', color: theme.red, desc: 'Defectos graves — no puede circular' },
]

function getItvStatus(record) {
  if (!record) return { status: 'none', label: 'Sin ITV registrada', color: theme.mutedLight }
  if (record.result === 'negativa') return { status: 'failed', label: 'No apta — Negativa', color: theme.red }
  if (record.result === 'desfavorable' && !record.resolved) return { status: 'defects', label: 'Pendiente reparar', color: theme.yellow }
  if (!record.expiry_date) return { status: 'unknown', label: 'Sin fecha de caducidad', color: theme.muted }

  const today = new Date()
  const expiry = new Date(record.expiry_date)
  const daysLeft = Math.floor((expiry - today) / 86400000)

  if (daysLeft < 0) return { status: 'expired', label: `Caducada hace ${Math.abs(daysLeft)} días`, color: theme.red }
  if (daysLeft <= 30) return { status: 'soon', label: `Caduca en ${daysLeft} días`, color: theme.yellow }
  if (daysLeft <= 60) return { status: 'approaching', label: `Caduca en ${daysLeft} días`, color: theme.accent }
  return { status: 'valid', label: `Válida hasta ${formatDate(record.expiry_date)}`, color: theme.green }
}

function ItvFormModal({ open, onClose, onSave, initial, isEditing }) {
  const todayStr = new Date().toISOString().split('T')[0]

  const defaultForm = {
    inspection_date: todayStr, expiry_date: '', result: 'favorable',
    station: '', defects: '', cost: 0, notes: '', resolved: false,
  }

  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens with new data
  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          inspection_date: initial.inspection_date || todayStr,
          expiry_date: initial.expiry_date || '',
          result: initial.result || 'favorable',
          station: initial.station || '',
          defects: initial.defects || '',
          cost: initial.cost || 0,
          notes: initial.notes || '',
          resolved: initial.resolved || false,
        })
      } else {
        setForm(defaultForm)
      }
    }
  }, [open, initial])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.inspection_date) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar ITV' : 'Nueva ITV'}>
      <ResponsiveGrid2>
        <Field label="Fecha inspección">
          <DateInput value={form.inspection_date} onChange={e => set('inspection_date', e.target.value)} />
        </Field>
        <Field label="Fecha caducidad">
          <DateInput value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
        </Field>
      </ResponsiveGrid2>

      <Field label="Resultado">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RESULTS.map(r => (
            <button key={r.value} onClick={() => set('result', r.value)} type="button" style={{
              ...css.btn(form.result === r.value ? r.color : theme.bg, form.result === r.value ? '#000' : theme.muted),
              flex: 1, justifyContent: 'center', border: `1px solid ${form.result === r.value ? r.color : theme.border}`,
              fontSize: 12, padding: '8px 10px', minWidth: 100,
            }}>{r.label}</button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>
          {RESULTS.find(r => r.value === form.result)?.desc}
        </p>
      </Field>

      {(form.result === 'desfavorable' || form.result === 'negativa') && (
        <Field label="Defectos encontrados">
          <textarea style={{ ...css.input, minHeight: 70, resize: 'vertical' }} value={form.defects}
            onChange={e => set('defects', e.target.value)} placeholder="Describe los defectos..." />
        </Field>
      )}

      {form.result === 'desfavorable' && (
        <Field label="¿Reparado y pasado?">
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => set('resolved', false)} style={{
              ...css.btn(!form.resolved ? theme.accent : theme.bg, !form.resolved ? '#000' : theme.muted),
              flex: 1, justifyContent: 'center', border: `1px solid ${theme.border}`,
            }}>⏳ Pendiente</button>
            <button type="button" onClick={() => set('resolved', true)} style={{
              ...css.btn(form.resolved ? theme.green : theme.bg, form.resolved ? '#000' : theme.muted),
              flex: 1, justifyContent: 'center', border: `1px solid ${theme.border}`,
            }}>✅ Reparado</button>
          </div>
        </Field>
      )}

      <ResponsiveGrid2>
        <Field label="Estación ITV">
          <input style={css.input} value={form.station} onChange={e => set('station', e.target.value)} placeholder="Nombre estación" />
        </Field>
        <Field label="Coste (€)">
          <NumInput decimal value={form.cost} onChange={e => set('cost', +e.target.value)} />
        </Field>
      </ResponsiveGrid2>
      <Field label="Notas">
        <input style={css.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observaciones..." />
      </Field>

      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
        <button onClick={onClose} style={css.btnOutline}>Cancelar</button>
        <button onClick={handleSave} disabled={saving} style={css.btn()}>
          <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}

export default function ItvCard({ carId, itvRecords, onReload, onToast, isMobile }) {
  const [showForm, setShowForm] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const latest = itvRecords[0] || null
  const itvStatus = getItvStatus(latest)
  const isAlert = ['expired', 'failed', 'defects', 'soon'].includes(itvStatus.status)

  const openEdit = (record) => {
    setEditRecord(record)
    setShowForm(true)
  }

  const openNew = () => {
    setEditRecord(null)
    setShowForm(true)
  }

  const handleSave = async (form) => {
    try {
      if (editRecord) {
        await updateItvRecord(editRecord.id, {
          inspection_date: form.inspection_date,
          expiry_date: form.expiry_date || null,
          result: form.result,
          station: form.station,
          defects: form.defects,
          cost: form.cost,
          notes: form.notes,
          resolved: form.resolved,
        })
        onToast('ITV actualizada')
      } else {
        await createItvRecord({ car_id: carId, ...form })
        onToast('ITV registrada')
      }
      setShowForm(false)
      setEditRecord(null)
      onReload()
    } catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro de ITV?')) return
    try { await deleteItvRecord(id); onToast('Registro eliminado'); onReload() }
    catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const StatusIcon = itvStatus.status === 'valid' || itvStatus.status === 'approaching'
    ? ShieldCheck : itvStatus.status === 'failed' || itvStatus.status === 'expired'
    ? ShieldX : ShieldAlert

  return (
    <>
      <div style={{
        ...css.card, marginBottom: 16, padding: isMobile ? 14 : 18,
        border: isAlert ? `1px solid ${itvStatus.color}40` : `1px solid ${theme.border}`,
        background: isAlert ? `${itvStatus.color}08` : theme.card,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${itvStatus.color}18`, borderRadius: 0, padding: 10, display: 'flex' }}>
              <StatusIcon size={22} color={itvStatus.color} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: theme.white }}>ITV</span>
                <span style={css.badge(`${itvStatus.color}20`, itvStatus.color)}>{itvStatus.label}</span>
              </div>
              {latest && (
                <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
                  Inspección: {formatDate(latest.inspection_date)} · {RESULTS.find(r => r.value === latest.result)?.label}
                  {latest.station ? ` · ${latest.station}` : ''}
                  {latest.cost ? ` · ${latest.cost}€` : ''}
                  {latest.defects && <span style={{ color: theme.yellow }}> · {latest.defects}</span>}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {latest && (
              <button onClick={() => openEdit(latest)} style={css.btnSm(theme.accentSoft, theme.accent)}>
                <Edit2 size={12} /> {isMobile ? '' : 'Editar'}
              </button>
            )}
            <button onClick={openNew} style={css.btnSm(theme.accent, '#000')}>
              <Plus size={12} /> {isMobile ? '' : 'Nueva'}
            </button>
            {itvRecords.length > 1 && (
              <button onClick={() => setShowHistory(!showHistory)} style={css.btnSm(theme.bg, theme.muted)}>
                <Calendar size={12} />
              </button>
            )}
          </div>
        </div>

        {showHistory && itvRecords.length > 1 && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
            {itvRecords.slice(1).map(r => {
              const res = RESULTS.find(x => x.value === r.result)
              return (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: theme.muted }}>{formatDate(r.inspection_date)}</span>
                    <span style={{ color: res?.color, fontWeight: 600, marginLeft: 8 }}>{res?.label}</span>
                    {r.station && <span style={{ color: theme.mutedLight, marginLeft: 8 }}>{r.station}</span>}
                    {r.defects && <span style={{ color: theme.yellow, marginLeft: 8 }}>{r.defects}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(r)} style={css.btnSm(theme.accentSoft, theme.accent)}><Edit2 size={11} /></button>
                    <button onClick={() => handleDelete(r.id)} style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={11} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ItvFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditRecord(null) }}
        onSave={handleSave}
        initial={editRecord}
        isEditing={!!editRecord}
      />
    </>
  )
}
