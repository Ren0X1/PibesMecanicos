import { useState, useEffect } from 'react'
import { CheckSquare, Square, Plus, Trash2, Save, Edit2, ChevronDown, ChevronRight, Flag } from 'lucide-react'
import { theme, css } from '../lib/theme.js'
import { createVehicleTodo, updateVehicleTodo, deleteVehicleTodo } from '../lib/api.js'
import { Modal, Field } from './ui.jsx'

const PRIORITIES = [
  { value: 'baja', label: 'Baja', color: theme.green },
  { value: 'media', label: 'Media', color: theme.yellow },
  { value: 'alta', label: 'Alta', color: theme.red },
]

function getPriorityColor(p) {
  return PRIORITIES.find(x => x.value === p)?.color || theme.muted
}

function getPriorityLabel(p) {
  return PRIORITIES.find(x => x.value === p)?.label || 'Media'
}

function TodoFormModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ title: '', notes: '', priority: 'media' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (open) {
      if (initial) setForm({ title: initial.title || '', notes: initial.notes || '', priority: initial.priority || 'media' })
      else setForm({ title: '', notes: '', priority: 'media' })
    }
  }, [open, initial])

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar tarea' : 'Nueva tarea'}>
      <Field label="Tarea">
        <input style={css.input} value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="Ej: Cambiar las pastillas delanteras"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSave()} />
      </Field>
      <Field label="Notas">
        <textarea style={{ ...css.input, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
          value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Detalles, referencias, dónde comprarlas..." />
      </Field>
      <Field label="Prioridad">
        <div style={{ display: 'flex', gap: 6 }}>
          {PRIORITIES.map(p => (
            <button key={p.value} type="button" onClick={() => set('priority', p.value)} style={{
              ...css.btn(form.priority === p.value ? p.color : theme.bg, form.priority === p.value ? '#000' : theme.muted),
              flex: 1, justifyContent: 'center',
              border: `1px solid ${form.priority === p.value ? p.color : theme.border}`,
              fontSize: 13, padding: '8px 6px',
            }}>{p.label}</button>
          ))}
        </div>
      </Field>
      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
        <button onClick={onClose} style={css.btnOutline}>Cancelar</button>
        <button onClick={handleSave} disabled={saving || !form.title.trim()} style={css.btn()}>
          <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}

function TodoRow({ todo, onToggle, onEdit, onDelete, isMobile }) {
  const color = getPriorityColor(todo.priority)
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: isMobile ? '10px 12px' : '12px 16px',
      borderBottom: `1px solid ${theme.border}`,
      background: todo.completed ? `${theme.green}05` : 'transparent',
    }}>
      <button onClick={() => onToggle(todo)} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1,
        color: todo.completed ? theme.green : theme.muted, display: 'flex', flexShrink: 0,
      }}>
        {todo.completed ? <CheckSquare size={20} /> : <Square size={20} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 14, fontWeight: 600,
            color: todo.completed ? theme.muted : theme.text,
            textDecoration: todo.completed ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}>{todo.title}</span>
          {!todo.completed && (
            <span style={css.badge(`${color}20`, color)}>
              <Flag size={9} /> {getPriorityLabel(todo.priority)}
            </span>
          )}
        </div>
        {todo.notes && (
          <p style={{
            fontSize: 12, color: theme.muted, marginTop: 4,
            textDecoration: todo.completed ? 'line-through' : 'none',
          }}>{todo.notes}</p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {!todo.completed && (
          <button onClick={() => onEdit(todo)} style={css.btnSm(theme.accentSoft, theme.accent)}>
            <Edit2 size={12} />
          </button>
        )}
        <button onClick={() => onDelete(todo)} style={css.btnSm(theme.redSoft, theme.red)}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

export default function TodoTab({ carId, todos, onReload, onToast, isMobile }) {
  const [showForm, setShowForm] = useState(false)
  const [editTodo, setEditTodo] = useState(null)
  const [quickAdd, setQuickAdd] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)

  const handleQuickAdd = async () => {
    if (!quickAdd.trim()) return
    try {
      await createVehicleTodo({ car_id: carId, title: quickAdd.trim(), priority: 'media' })
      setQuickAdd('')
      onToast('Tarea añadida')
      onReload()
    } catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const handleSave = async (form) => {
    try {
      if (editTodo) {
        await updateVehicleTodo(editTodo.id, { title: form.title, notes: form.notes, priority: form.priority })
        onToast('Tarea actualizada')
      } else {
        await createVehicleTodo({ car_id: carId, ...form })
        onToast('Tarea creada')
      }
      setShowForm(false); setEditTodo(null); onReload()
    } catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const handleToggle = async (todo) => {
    try {
      await updateVehicleTodo(todo.id, {
        completed: !todo.completed,
        completed_at: !todo.completed ? new Date().toISOString() : null,
      })
      onToast(todo.completed ? 'Tarea reabierta' : 'Tarea completada ✓')
      onReload()
    } catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const handleDelete = async (todo) => {
    if (!confirm(`¿Eliminar la tarea "${todo.title}"?`)) return
    try {
      await deleteVehicleTodo(todo.id)
      onToast('Tarea eliminada')
      onReload()
    } catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  // Sort: pending by priority (alta > media > baja), then completed at bottom
  const priorityOrder = { alta: 0, media: 1, baja: 2 }
  const pending = todos.filter(t => !t.completed).sort((a, b) => {
    return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
  })
  const completed = todos.filter(t => t.completed).sort((a, b) =>
    new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at)
  )

  return (
    <>
      {/* Quick add */}
      <div style={{ ...css.card, padding: isMobile ? 10 : 14, marginBottom: 12, display: 'flex', gap: 8 }}>
        <input style={{ ...css.input, flex: 1 }}
          value={quickAdd} onChange={e => setQuickAdd(e.target.value)}
          placeholder="Añadir tarea rápida..."
          onKeyDown={e => e.key === 'Enter' && handleQuickAdd()} />
        <button onClick={handleQuickAdd} disabled={!quickAdd.trim()}
          style={{ ...css.btn(), padding: '8px 14px', opacity: !quickAdd.trim() ? 0.5 : 1 }}>
          <Plus size={16} />
        </button>
        <button onClick={() => { setEditTodo(null); setShowForm(true) }}
          style={css.btnOutline} title="Tarea con detalles">
          <Edit2 size={14} />
        </button>
      </div>

      {/* Empty state */}
      {todos.length === 0 && (
        <div style={{ ...css.card, padding: 40, textAlign: 'center' }}>
          <CheckSquare size={36} color={theme.mutedLight} style={{ marginBottom: 10 }} />
          <p style={{ color: theme.muted, fontSize: 13 }}>Sin tareas pendientes</p>
          <p style={{ color: theme.mutedLight, fontSize: 12, marginTop: 4 }}>
            Añade cosas que tengas que hacer al vehículo
          </p>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div style={{ ...css.card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ ...css.flexBetween, padding: isMobile ? '12px 14px' : '14px 18px', borderBottom: `1px solid ${theme.border}` }}>
            <h3 style={css.h3}>📋 Pendientes ({pending.length})</h3>
          </div>
          {pending.map(t => (
            <TodoRow key={t.id} todo={t} onToggle={handleToggle} onEdit={(t) => { setEditTodo(t); setShowForm(true) }} onDelete={handleDelete} isMobile={isMobile} />
          ))}
        </div>
      )}

      {/* Completed (collapsible) */}
      {completed.length > 0 && (
        <div style={{ ...css.card, padding: 0, overflow: 'hidden' }}>
          <button onClick={() => setShowCompleted(!showCompleted)} style={{
            width: '100%', background: 'transparent', border: 'none',
            padding: isMobile ? '12px 14px' : '14px 18px',
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            color: theme.muted, fontFamily: 'inherit',
          }}>
            {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span style={{ fontWeight: 600, fontSize: 14 }}>✓ Completadas ({completed.length})</span>
          </button>
          {showCompleted && completed.map(t => (
            <TodoRow key={t.id} todo={t} onToggle={handleToggle} onEdit={() => {}} onDelete={handleDelete} isMobile={isMobile} />
          ))}
        </div>
      )}

      <TodoFormModal open={showForm} onClose={() => { setShowForm(false); setEditTodo(null) }} onSave={handleSave} initial={editTodo} />
    </>
  )
}
