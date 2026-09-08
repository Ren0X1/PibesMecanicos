import { useState, useEffect } from 'react'
import { Bell, Plus, Trash2, Save, Edit2, CheckSquare, Square, ChevronDown, ChevronRight, Calendar, Car } from 'lucide-react'
import { theme, css } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { getReminders, createReminder, updateReminder, deleteReminder, getCars, getMaintenanceRecords, getItvRecords } from '../lib/api.js'
import { formatDate, getMaintStatus, MAINT_TYPES } from '../lib/constants.js'
import { Modal, Field, Loader, DateInput } from './ui.jsx'
import { t, useLang } from '../lib/i18n.js'
import TwoColumn, { Panel, Row, AttentionList } from './TwoColumn.jsx'

function getDueStatus(reminder) {
  if (reminder.completed) return { label: t('rem.completed'), color: theme.green, days: null }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(reminder.due_date)
  due.setHours(0, 0, 0, 0)
  const days = Math.floor((due - today) / 86400000)
  if (days < 0) return { label: t('rem.agoDays', { n: Math.abs(days) }), color: theme.red, days }
  if (days === 0) return { label: t('rem.today'), color: theme.yellow, days }
  if (days === 1) return { label: t('rem.tomorrow'), color: theme.yellow, days }
  if (days <= 7) return { label: t('rem.inDays', { n: days }), color: theme.accent, days }
  return { label: t('rem.inDays', { n: days }), color: theme.muted, days }
}

function ReminderFormModal({ open, onClose, onSave, initial, cars }) {
  const [form, setForm] = useState({ title: '', notes: '', due_date: '', car_id: null })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          title: initial.title || '', notes: initial.notes || '',
          due_date: initial.due_date || '', car_id: initial.car_id || null,
        })
      } else {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setForm({ title: '', notes: '', due_date: tomorrow.toISOString().split('T')[0], car_id: null })
      }
    }
  }, [open, initial])

  const handleSave = async () => {
    if (!form.title.trim() || !form.due_date) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? t('rem.edit') : t('rem.new')}>
      <Field label={t('common.title')}>
        <input style={css.input} value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder={t('rem.titlePh')}
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleSave()} />
      </Field>
      <Field label={t('rem.dueDate')}>
        <DateInput value={form.due_date} onChange={e => set('due_date', e.target.value)} />
      </Field>
      {cars.length > 0 && (
        <Field label={t('rem.vehicleOpt')}>
          <select style={css.select} value={form.car_id || ''}
            onChange={e => set('car_id', e.target.value || null)}>
            <option value="">{t('rem.general')}</option>
            {cars.map(c => (
              <option key={c.id} value={c.id}>
                {c.vehicle_type === 'moto' ? '🏍️' : '🚗'} {c.brand} {c.model} · {c.plate}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={t('common.notes')}>
        <textarea style={{ ...css.input, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
          value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder={t('rem.notesPh')} />
      </Field>
      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
        <button onClick={onClose} style={css.btnOutline}>{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.due_date} style={css.btn()}>
          <Save size={14} /> {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </Modal>
  )
}

function ReminderRow({ reminder, onToggle, onEdit, onDelete, isMobile }) {
  const status = getDueStatus(reminder)
  const car = reminder.cars
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: isMobile ? '12px 14px' : '14px 18px',
      borderBottom: `1px solid ${theme.border}`,
      background: reminder.completed ? `${theme.green}05` : (status.days != null && status.days < 0 ? `${theme.red}08` : 'transparent'),
    }}>
      <button onClick={() => onToggle(reminder)} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2,
        color: reminder.completed ? theme.green : theme.muted, display: 'flex', flexShrink: 0,
      }}>
        {reminder.completed ? <CheckSquare size={20} /> : <Square size={20} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 14, fontWeight: 600,
            color: reminder.completed ? theme.muted : theme.text,
            textDecoration: reminder.completed ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}>{reminder.title}</span>
          {!reminder.completed && (
            <span style={css.badge(`${status.color}20`, status.color)}>
              <Calendar size={9} /> {status.label}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: theme.muted, marginTop: 4, flexWrap: 'wrap' }}>
          <span>📅 {formatDate(reminder.due_date)}</span>
          {car && (
            <span>{car.vehicle_type === 'moto' ? '🏍️' : '🚗'} {car.brand} {car.model}</span>
          )}
        </div>
        {reminder.notes && (
          <p style={{ fontSize: 12, color: theme.muted, marginTop: 4, textDecoration: reminder.completed ? 'line-through' : 'none' }}>
            {reminder.notes}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {!reminder.completed && (
          <button onClick={() => onEdit(reminder)} style={css.btnSm(theme.accentSoft, theme.accent)}>
            <Edit2 size={12} />
          </button>
        )}
        <button onClick={() => onDelete(reminder)} style={css.btnSm(theme.redSoft, theme.red)}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

/* Lo que reclaman los vehículos, que no son recordatorios que haya
   escrito nadie: mantenimientos vencidos o a punto, e ITV a menos
   de treinta días. Se junta aquí para poder enseñarlo al lado de
   los recordatorios propios, que es donde se mira. */
async function vehicleDue(cars) {
  const out = []
  for (const car of cars) {
    const [maint, itv] = await Promise.all([
      getMaintenanceRecords(car.id), getItvRecords(car.id),
    ])

    for (const m of maint) {
      const st = getMaintStatus(m, car.current_km)
      if (st !== 'overdue' && st !== 'warn') continue
      const tipo = MAINT_TYPES.find(x => x.id === m.type_id)
      out.push({
        key: `${car.id}-${m.type_id}`,
        title: tipo?.name || m.type_id,
        sub: car.plate,
        color: st === 'overdue' ? theme.red : theme.yellow,
        rank: st === 'overdue' ? 0 : 1,
      })
    }

    const last = itv[0]
    if (last?.expiry_date) {
      const dias = Math.floor((new Date(last.expiry_date) - new Date()) / 86400000)
      if (dias <= 30) {
        out.push({
          key: `${car.id}-itv`,
          title: t('itv.title'),
          sub: `${car.plate} · ${formatDate(last.expiry_date)}`,
          color: dias < 0 ? theme.red : theme.yellow,
          rank: dias < 0 ? 0 : 1,
        })
      }
    }
  }
  return out.sort((a, b) => a.rank - b.rank)
}

export default function Reminders({ user, onToast }) {
  useLang()
  const mob = useIsMobile()
  const [reminders, setReminders] = useState([])
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editReminder, setEditReminder] = useState(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [carDue, setCarDue] = useState([])

  const load = async () => {
    try {
      const [rem, c] = await Promise.all([getReminders(user.id), getCars(user.id)])
      setReminders(rem)
      setCars(c)
      setCarDue(await vehicleDue(c))
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user.id])

  const handleSave = async (form) => {
    try {
      if (editReminder) {
        await updateReminder(editReminder.id, {
          title: form.title, notes: form.notes,
          due_date: form.due_date, car_id: form.car_id || null,
        })
        onToast(t('common.updated'))
      } else {
        await createReminder({
          user_id: user.id, title: form.title, notes: form.notes,
          due_date: form.due_date, car_id: form.car_id || null,
        })
        onToast(t('common.created'))
      }
      setShowForm(false); setEditReminder(null); load()
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  const handleToggle = async (r) => {
    try {
      await updateReminder(r.id, {
        completed: !r.completed,
        completed_at: !r.completed ? new Date().toISOString() : null,
      })
      onToast(r.completed ? t('rem.reopened') : t('rem.done'))
      load()
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  const handleDelete = async (r) => {
    if (!confirm(t('rem.confirm', { title: r.title }))) return
    try { await deleteReminder(r.id); onToast(t('common.deleted')); load() }
    catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  if (loading) return <Loader text={t('common.loading')} />

  const pending = reminders.filter(r => !r.completed)
  const completed = reminders.filter(r => r.completed)
  const overdue = pending.filter(r => getDueStatus(r).days < 0).length
  const dueSoon = pending.filter(r => { const d = getDueStatus(r).days; return d >= 0 && d <= 7 }).length

  /* Lo de esta semana incluye lo vencido: si algo se pasó de fecha
     no deja de ser cosa de esta semana, al contrario. */
  const semana = pending.filter(r => getDueStatus(r).days <= 7)
  const enPlazo = dias => pending.filter(r => {
    const d = getDueStatus(r).days
    return d >= 0 && d <= dias
  }).length

  return (
    <div style={css.container}>
      <div style={{ paddingTop: mob ? 20 : 28, paddingBottom: 40 }}>
        <div style={{ ...css.flexBetween, marginBottom: 16, gap: 12 }}>
          <div>
            <h1 style={{ ...css.h1, fontSize: mob ? 22 : 26 }}>{t('rem.title')}</h1>
            <p style={css.subtitle}>
              {t('rem.sub', { n: pending.length })}
              {overdue > 0 && <span style={{ color: theme.red }}> · {t('dash.overdue', { n: overdue })}</span>}
              {dueSoon > 0 && <span style={{ color: theme.yellow }}> · {t('dash.upcoming', { n: dueSoon })}</span>}
            </p>
          </div>
          <button onClick={() => { setEditReminder(null); setShowForm(true) }} style={css.btn()}>
            <Plus size={16} /> {mob ? t('common.new') : t('rem.new')}
          </button>
        </div>

        {reminders.length === 0 ? (
          <div style={{ ...css.card, padding: 40, textAlign: 'center' }}>
            <Bell size={40} color={theme.mutedLight} style={{ marginBottom: 12 }} />
            <p style={css.lbl}>{t('rem.empty')}</p>
            <p style={{ color: theme.mutedLight, fontSize: 12, marginTop: 4 }}>
              {t('rem.emptyHint')}
            </p>
            <button onClick={() => { setEditReminder(null); setShowForm(true) }} style={{ ...css.btn(), marginTop: 12 }}>
              <Plus size={14} /> {t('rem.createFirst')}
            </button>
          </div>
        ) : (
          <TwoColumn context={
            <>
              <Panel title={t('rem.thisWeek')} right={semana.length || null}>
                <AttentionList
                  empty={t('rem.emptyWeek')}
                  items={semana.map(r => {
                    const st = getDueStatus(r)
                    return { key: r.id, title: r.title, sub: st.label, color: st.color }
                  })}
                />
              </Panel>

              <Panel title={t('rem.fromCars')} right={carDue.length || null}>
                <AttentionList items={carDue.slice(0, 5)} empty={t('rem.emptyCars')} />
              </Panel>

              <Panel title={t('rem.next90')}>
                <Row label={t('rem.overdueN')} value={overdue} color={overdue ? theme.red : theme.muted} />
                <Row label={t('rem.inDays', { n: 7 })} value={dueSoon} color={dueSoon ? theme.yellow : theme.muted} />
                <Row label={t('rem.inDays', { n: 30 })} value={enPlazo(30)} />
                <Row label={t('rem.inDays', { n: 90 })} value={enPlazo(90)} />
              </Panel>
            </>
          }>
            {pending.length > 0 && (
              <div style={{ ...css.card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: mob ? '12px 14px' : '14px 18px', borderBottom: `1px solid ${theme.border}` }}>
                  <h3 style={css.h3}>{t('common.pending')} ({pending.length})</h3>
                </div>
                {pending.map(r => (
                  <ReminderRow key={r.id} reminder={r} onToggle={handleToggle}
                    onEdit={(r) => { setEditReminder(r); setShowForm(true) }}
                    onDelete={handleDelete} isMobile={mob} />
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <div style={{ ...css.card, padding: 0, overflow: 'hidden' }}>
                <button onClick={() => setShowCompleted(!showCompleted)} style={{
                  width: '100%', background: 'transparent', border: 'none',
                  padding: mob ? '12px 14px' : '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  color: theme.muted, fontFamily: 'inherit',
                }}>
                  {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span style={{ ...css.lbl, color: theme.text }}>{t('rem.completed')} ({completed.length})</span>
                </button>
                {showCompleted && completed.map(r => (
                  <ReminderRow key={r.id} reminder={r} onToggle={handleToggle}
                    onEdit={() => {}} onDelete={handleDelete} isMobile={mob} />
                ))}
              </div>
            )}
          </TwoColumn>
        )}
      </div>
      <ReminderFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditReminder(null) }}
        onSave={handleSave}
        initial={editReminder}
        cars={cars}
      />
    </div>
  )
}
