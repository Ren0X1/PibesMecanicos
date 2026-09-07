import { useState, useEffect } from 'react'
import { Wrench, Plus, Trash2, Save, Edit2, Star, Phone, MapPin, MessageCircle } from 'lucide-react'
import { theme, css } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { getWorkshops, createWorkshop, deleteWorkshop, updateWorkshop } from '../lib/api.js'
import { Modal, Field, Loader } from './ui.jsx'

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
    <Modal open={open} onClose={onClose} title={initial ? 'Editar Taller' : 'Nuevo Taller'}>
      <Field label="Nombre del taller"><input style={css.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Talleres Pérez" /></Field>
      <Field label="Teléfono"><input style={css.input} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="612 345 678" /></Field>
      <Field label="Dirección"><input style={css.input} value={form.address} onChange={e => set('address', e.target.value)} placeholder="C/ Mayor 15, Madrid" /></Field>
      <Field label="Especialidad"><input style={css.input} value={form.specialty} onChange={e => set('specialty', e.target.value)} placeholder="Ej: BMW, frenos, ITV..." /></Field>
      <Field label="Valoración"><StarRating value={form.rating} onChange={v => set('rating', v)} /></Field>
      <Field label="Notas"><input style={css.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Experiencia, precios..." /></Field>
      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
        <button onClick={onClose} style={css.btnOutline}>Cancelar</button>
        <button onClick={handleSave} disabled={saving} style={css.btn()}><Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </Modal>
  )
}

export default function Workshops({ user, onToast }) {
  const mob = useIsMobile()
  const [workshops, setWorkshops] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editWs, setEditWs] = useState(null)
  const isAdmin = user.role === 'admin'

  const load = async () => {
    try { setWorkshops(await getWorkshops()) }
    catch (err) { onToast('Error cargando talleres: ' + err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form) => {
    try {
      if (editWs) {
        await updateWorkshop(editWs.id, form)
        onToast('Taller actualizado')
      } else {
        await createWorkshop({ ...form, created_by: user.id })
        onToast('Taller añadido')
      }
      setShowForm(false); setEditWs(null); load()
    } catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este taller?')) return
    try { await deleteWorkshop(id); onToast('Taller eliminado'); load() }
    catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const canEdit = (ws) => isAdmin || ws.created_by === user.id
  const canDelete = (ws) => isAdmin || ws.created_by === user.id

  if (loading) return <Loader text="Cargando talleres..." />

  return (
    <div style={css.container}>
      <div style={{ paddingTop: mob ? 20 : 28, paddingBottom: 40 }}>
        <div style={{ ...css.flexBetween, marginBottom: 20, gap: 12 }}>
          <div>
            <h1 style={{ ...css.h1, fontSize: mob ? 22 : 26 }}>Talleres</h1>
            <p style={css.subtitle}>Directorio compartido · {workshops.length} taller{workshops.length !== 1 ? 'es' : ''}</p>
          </div>
          <button onClick={() => { setEditWs(null); setShowForm(true) }} style={css.btn()}>
            <Plus size={16} /> {mob ? 'Añadir' : 'Nuevo Taller'}
          </button>
        </div>

        {workshops.length === 0 ? (
          <div style={{ ...css.card, padding: 40, textAlign: 'center' }}>
            <Wrench size={40} color={theme.mutedLight} style={{ marginBottom: 12 }} />
            <p style={{ color: theme.muted, fontSize: 13 }}>No hay talleres registrados aún</p>
            <button onClick={() => { setEditWs(null); setShowForm(true) }} style={{ ...css.btn(), marginTop: 12 }}><Plus size={14} /> Añadir taller</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {workshops.map(ws => (
              <div key={ws.id} style={{ ...css.card, padding: mob ? 14 : 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <h3 style={css.h3}>{ws.name}</h3>
                      {ws.specialty && <span style={css.badge('rgba(139,92,246,0.12)', '#8b5cf6')}>{ws.specialty}</span>}
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
                              title="Llamar">
                              <Phone size={11} /> Llamar
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
                      Añadido por {ws.profiles?.name || 'desconocido'}
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
        )}
      </div>
      <WorkshopFormModal open={showForm} onClose={() => { setShowForm(false); setEditWs(null) }} onSave={handleSave} initial={editWs} />
    </div>
  )
}
