import { useState, useEffect } from 'react'
import { Wrench, Plus, Trash2, Save, Edit2, Star, Phone, MapPin, MessageCircle } from 'lucide-react'
import { theme, css } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { getWorkshops, createWorkshop, deleteWorkshop, updateWorkshop, getCars, getMaintenanceRecords } from '../lib/api.js'
import { Modal, Field, Loader } from './ui.jsx'
import { t, useLang, fmtMoney } from '../lib/i18n.js'
import { MAINT_TYPES, formatDate } from '../lib/constants.js'
import TwoColumn, { useTwoCol, Panel, Figure, AttentionList } from './TwoColumn.jsx'

function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange?.(n)} type="button"
          style={{ background: 'none', border: 'none', cursor: onChange ? 'pointer' : 'default', padding: 2 }}>
          <Star size={20} fill={n <= value ? theme.accent : 'none'} color={n <= value ? theme.accent : theme.mutedLight} />
        </button>
      ))}
    </div>
  )
}

function WorkshopFormModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', rating: 3, specialty: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (open && initial) setForm({ name: initial.name || '', phone: initial.phone || '', address: initial.address || '', rating: initial.rating || 3, specialty: initial.specialty || '', notes: initial.notes || '' })
    else if (open) setForm({ name: '', phone: '', address: '', rating: 3, specialty: '', notes: '' })
  }, [open, initial])

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={initial ? t('wsh.edit') : t('wsh.new')}>
      <Field label={t('wsh.nameField')}><input style={css.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('wsh.namePh')} /></Field>
      <Field label={t('common.phone')}><input style={{ ...css.input, ...css.num }} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder={t('wsh.phonePh')} /></Field>
      <Field label={t('common.address')}><input style={css.input} value={form.address} onChange={e => set('address', e.target.value)} placeholder={t('wsh.addressPh')} /></Field>
      <Field label={t('wsh.specialty')}><input style={css.input} value={form.specialty} onChange={e => set('specialty', e.target.value)} placeholder={t('wsh.specialtyPh')} /></Field>
      <Field label={t('wsh.rating')}><StarRating value={form.rating} onChange={v => set('rating', v)} /></Field>
      <Field label={t('common.notes')}><input style={css.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={t('wsh.notesPh')} /></Field>
      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
        <button onClick={onClose} style={css.btnOutline}>{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving} style={css.btn()}><Save size={13} /> {saving ? t('common.saving') : t('common.save')}</button>
      </div>
    </Modal>
  )
}

export default function Workshops({ user, onToast }) {
  useLang()
  const mob = useIsMobile()
  const [workshops, setWorkshops] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editWs, setEditWs] = useState(null)
  const [jobs, setJobs] = useState([])
  const [selected, setSelected] = useState(null)
  const isAdmin = user.role === 'admin'

  const load = async () => {
    try {
      const list = await getWorkshops()
      setWorkshops(list)
      setSelected(prev => prev ?? list[0]?.id ?? null)

      /* Los trabajos hechos en cada taller. Vienen de los
         mantenimientos de los vehículos propios, que son los
         únicos cuyo coste es de uno. */
      const cars = await getCars(user.id)
      const todo = []
      for (const car of cars) {
        for (const m of await getMaintenanceRecords(car.id)) {
          if (!m.workshop_id) continue
          todo.push({ ...m, plate: car.plate })
        }
      }
      setJobs(todo)
    }
    catch (err) { onToast(t('wsh.loadError') + err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form) => {
    try {
      if (editWs) {
        await updateWorkshop(editWs.id, form)
        onToast(t('wsh.updated'))
      } else {
        await createWorkshop({ ...form, created_by: user.id })
        onToast(t('wsh.added'))
      }
      setShowForm(false); setEditWs(null); load()
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('wsh.confirm'))) return
    try { await deleteWorkshop(id); onToast(t('wsh.deleted')); load() }
    catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  const canEdit = (ws) => isAdmin || ws.created_by === user.id
  const canDelete = (ws) => isAdmin || ws.created_by === user.id

  const { two } = useTwoCol()

  if (loading) return <Loader text={t('common.loading')} />

  const ficha = workshops.find(w => w.id === selected) || null
  const suyos = jobs
    .filter(j => j.workshop_id === selected)
    .sort((a, b) => String(b.last_date).localeCompare(String(a.last_date)))
  const gastado = suyos.reduce((n, j) => n + +(j.cost || 0), 0)

  return (
    <div style={css.container}>
      <div style={{ paddingTop: mob ? 20 : 28, paddingBottom: 40 }}>
        <div style={{ ...css.flexBetween, marginBottom: 20, gap: 12 }}>
          <div>
            <h1 style={{ ...css.h1, fontSize: mob ? 22 : 26 }}>{t('wsh.title')}</h1>
            <p style={css.subtitle}>{t('wsh.sub', { n: workshops.length })}</p>
          </div>
          <button onClick={() => { setEditWs(null); setShowForm(true) }} style={css.btn()}>
            <Plus size={14} /> {mob ? t('common.add') : t('wsh.new')}
          </button>
        </div>

        {workshops.length === 0 ? (
          <div style={{ ...css.card, padding: 40, textAlign: 'center' }}>
            <Wrench size={40} color={theme.mutedLight} style={{ marginBottom: 12 }} />
            <p style={css.lbl}>{t('wsh.empty')}</p>
            <button onClick={() => { setEditWs(null); setShowForm(true) }} style={{ ...css.btn(), marginTop: 12 }}><Plus size={14} /> {t('wsh.add')}</button>
          </div>
        ) : (
          <TwoColumn narrow="hide" context={two ? (
            <>
              <Panel title={t('wsh.spentHere')}>
                <Figure
                  label={ficha?.name || t('wsh.pickOne')}
                  value={fmtMoney(gastado)}
                  note={ficha ? t('wsh.jobs', { n: suyos.length }) : null}
                />
              </Panel>

              <Panel title={t('wsh.history')} right={suyos.length || null}>
                <AttentionList
                  empty={ficha ? t('wsh.noHistory') : t('wsh.pickOne')}
                  items={suyos.slice(0, 8).map(j => ({
                    key: j.id,
                    title: MAINT_TYPES.find(x => x.id === j.type_id)?.name || j.type_id,
                    sub: `${j.plate} · ${formatDate(j.last_date)}`,
                    value: j.cost ? fmtMoney(j.cost) : null,
                    color: theme.accent,
                  }))}
                />
              </Panel>
            </>
          ) : null}>
          <div style={{ display: 'grid', gap: 10 }}>
            {workshops.map(ws => (
              <div key={ws.id}
                onClick={() => setSelected(ws.id)}
                style={{
                  ...css.card, padding: mob ? 14 : 20,
                  cursor: two ? 'pointer' : 'default',
                  /* El elegido se marca con un filete al canto, que
                     es como se marca todo en esta interfaz. */
                  borderLeft: two && ws.id === selected
                    ? `3px solid ${theme.accent}`
                    : `1px solid ${theme.border}`,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <h3 style={css.h3}>{ws.name}</h3>
                      {ws.specialty && <span style={css.badge(theme.accentSoft, theme.accent)}>{ws.specialty}</span>}
                    </div>
                    <StarRating value={ws.rating || 0} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                      {ws.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.muted, fontSize: 13 }}>
                            <Phone size={13} /> {ws.phone}
                          </span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <a href={`tel:${ws.phone.replace(/\s/g, '')}`}
                              style={{ ...css.btnSm(theme.accentSoft, theme.accent), textDecoration: 'none' }}
                              title={t('wsh.call')}>
                              <Phone size={11} /> {t('wsh.call')}
                            </a>
                            <a href={`https://wa.me/${ws.phone.replace(/[^\d]/g, '').replace(/^0+/, '')}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ ...css.btnSm('rgba(37,211,102,0.15)', '#25D366'), textDecoration: 'none' }}
                              title="WhatsApp">
                              <MessageCircle size={11} /> WhatsApp
                            </a>
                          </div>
                        </div>
                      )}
                      {ws.address && <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.muted, fontSize: 13 }}><MapPin size={13} /> {ws.address}</span>}
                      {ws.notes && <p style={{ color: theme.muted, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>"{ws.notes}"</p>}
                    </div>
                    <p style={{ fontSize: 11, color: theme.mutedLight, marginTop: 8 }}>
                      {t('wsh.addedBy', { name: ws.profiles?.name || t('common.unknown') })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {canEdit(ws) && <button onClick={() => { setEditWs(ws); setShowForm(true) }} style={css.btnSm(theme.accentSoft, theme.accent)}><Edit2 size={12} /></button>}
                    {canDelete(ws) && <button onClick={() => handleDelete(ws.id)} style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          </TwoColumn>
        )}
      </div>
      <WorkshopFormModal open={showForm} onClose={() => { setShowForm(false); setEditWs(null) }} onSave={handleSave} initial={editWs} />
    </div>
  )
}
