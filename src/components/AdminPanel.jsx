import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Save, Users, Car, Key, BarChart3, ShieldCheck, Edit2, Check, X, UserCog, Inbox } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { theme, css } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { getProfiles, createProfile, deleteProfile, updateProfile, getCars, getMaintenanceRecords, getPendingGroups, approveGroup, rejectGroup } from '../lib/api.js'
import { getMaintStatus, formatDate } from '../lib/constants.js'
import { Modal, Field, Loader, Stat } from './ui.jsx'

const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 0, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 2, color: theme.text }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>)}
    </div>
  )
}

export default function AdminPanel({ onToast }) {
  const mob = useIsMobile()
  const [users, setUsers] = useState([])
  const [allCars, setAllCars] = useState([])
  const [allMaint, setAllMaint] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', username: '', pin: '1234', role: 'user' })
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('users')
  const [editUser, setEditUser] = useState(null)         // user object being edited
  const [editForm, setEditForm] = useState({ name: '', username: '', role: 'user' })
  const [resetPinUser, setResetPinUser] = useState(null) // user object for PIN reset
  const [newPin, setNewPin] = useState('')
  const [pendingGroups, setPendingGroups] = useState([])

  const loadAll = async () => {
    try {
      const profiles = await getProfiles()
      setUsers(profiles)
      const cars = []
      const maints = []
      for (const p of profiles) {
        const c = await getCars(p.id)
        cars.push(...c.map(car => ({ ...car, ownerName: p.name })))
        for (const car of c) {
          const m = await getMaintenanceRecords(car.id)
          maints.push(...m.map(r => ({ ...r, carName: `${car.brand} ${car.model}`, currentKm: car.current_km })))
        }
      }
      setAllCars(cars)
      setAllMaint(maints)
      try { setPendingGroups(await getPendingGroups()) } catch {}
    } catch (err) { onToast('Error: ' + err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const handleAdd = async () => {
    if (!newUser.name || !newUser.username) return
    setSaving(true)
    try {
      await createProfile({ ...newUser, pin_change_required: true })
      setNewUser({ name: '', username: '', pin: '1234', role: 'user' })
      setShowNew(false); onToast('Usuario creado — se le pedirá cambiar el PIN'); loadAll()
    } catch (err) { onToast('Error: ' + err.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar al usuario "${name}"?`)) return
    try { await deleteProfile(id); onToast('Usuario eliminado'); loadAll() }
    catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const handleForcePin = async (id, name) => {
    if (!confirm(`¿Forzar cambio de PIN para "${name}"?`)) return
    try { await updateProfile(id, { pin_change_required: true }); onToast(`Se pedirá a ${name} que cambie su PIN`); loadAll() }
    catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const openEdit = (u) => {
    setEditUser(u)
    setEditForm({ name: u.name, username: u.username, role: u.role })
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.username.trim()) return
    setSaving(true)
    try {
      await updateProfile(editUser.id, {
        name: editForm.name.trim(),
        username: editForm.username.trim().toLowerCase(),
        role: editForm.role,
      })
      setEditUser(null); onToast('Usuario actualizado'); loadAll()
    } catch (err) { onToast('Error: ' + (err.message?.includes('duplicate') ? 'Ese usuario ya existe' : err.message), 'error') }
    finally { setSaving(false) }
  }

  const handleSaveResetPin = async () => {
    if (newPin.length < 4) return onToast('El PIN debe tener al menos 4 dígitos', 'error')
    setSaving(true)
    try {
      // Reset PIN + force change on next login for security
      await updateProfile(resetPinUser.id, { pin: newPin, pin_change_required: true })
      setResetPinUser(null); setNewPin('')
      onToast('PIN restablecido — el usuario deberá cambiarlo al entrar'); loadAll()
    } catch (err) { onToast('Error: ' + err.message, 'error') }
    finally { setSaving(false) }
  }

  const handleApproveGroup = async (g) => {
    try { await approveGroup(g.id, g.created_by); onToast(`Grupo "${g.name}" aprobado`); loadAll() }
    catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const handleRejectGroup = async (g) => {
    if (!confirm(`¿Rechazar la solicitud del grupo "${g.name}"?`)) return
    try { await rejectGroup(g.id); onToast('Solicitud rechazada'); loadAll() }
    catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  // Stats
  const stats = useMemo(() => {
    const totalKm = allCars.reduce((s, c) => s + (c.current_km || 0), 0)
    let ok = 0, warn = 0, overdue = 0
    allMaint.forEach(m => { const s = getMaintStatus(m, m.currentKm); if (s === 'ok') ok++; else if (s === 'warn') warn++; else if (s === 'overdue') overdue++ })

    const carsPerUser = users.map(u => ({ name: u.name, count: allCars.filter(c => c.user_id === u.id).length }))
    const vehicleTypes = [
      { name: 'Coches', value: allCars.filter(c => c.vehicle_type !== 'moto').length },
      { name: 'Motos', value: allCars.filter(c => c.vehicle_type === 'moto').length },
    ].filter(v => v.value > 0)

    return { totalKm, ok, warn, overdue, total: ok + warn + overdue, carsPerUser, vehicleTypes }
  }, [users, allCars, allMaint])

  if (loading) return <Loader text="Cargando panel..." />

  const tabs = [
    { id: 'users', icon: <Users size={14} />, label: 'Usuarios' },
    { id: 'groups', icon: <Inbox size={14} />, label: 'Grupos', badge: pendingGroups.length > 0 ? pendingGroups.length : null },
    { id: 'stats', icon: <BarChart3 size={14} />, label: 'Estadísticas' },
  ]

  return (
    <div style={css.container}>
      <div style={{ paddingTop: mob ? 20 : 28, paddingBottom: 40 }}>
        <h1 style={{ ...css.h1, fontSize: mob ? 22 : 26, marginBottom: 20 }}>Administración</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: theme.bg, borderRadius: 0, padding: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: mob ? 4 : 5, flex: 1, justifyContent: 'center', minWidth: 0,
              background: tab === t.id ? theme.card : 'transparent', color: tab === t.id ? theme.text : theme.muted,
              border: tab === t.id ? `1px solid ${theme.border}` : '1px solid transparent',
              borderRadius: 0, padding: mob ? '8px 4px' : '8px 12px', cursor: 'pointer', fontWeight: 600,
              fontSize: mob ? 12 : 13, fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
              {t.icon}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
              {t.badge && (
                <span style={{
                  background: theme.red, color: '#fff', borderRadius: 0, minWidth: 17, height: 17,
                  padding: '0 5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, flexShrink: 0,
                }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <>
            <div style={{ ...css.flexBetween, marginBottom: 16, gap: 12 }}>
              <p style={css.subtitle}>
                {users.filter(u => u.role === 'admin').length} admin{users.filter(u => u.role === 'admin').length !== 1 ? 's' : ''} · {users.filter(u => u.role !== 'admin').length} usuario{users.filter(u => u.role !== 'admin').length !== 1 ? 's' : ''}
              </p>
              <button onClick={() => setShowNew(true)} style={css.btn()}><Plus size={16} /> {mob ? 'Nuevo' : 'Nuevo Usuario'}</button>
            </div>

            {(() => {
              const renderUserCard = (u) => {
                const uCars = allCars.filter(c => c.user_id === u.id)
                const isAdminUser = u.role === 'admin'
                return (
                  <div key={u.id} style={{
                    ...css.card, padding: mob ? 14 : 18, marginBottom: 0,
                    border: `1px solid ${isAdminUser ? theme.accent + '33' : theme.border}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{ background: isAdminUser ? theme.accentSoft : theme.bg, borderRadius: 0, padding: 9, display: 'flex', flexShrink: 0 }}>
                          {isAdminUser ? <ShieldCheck size={18} color={theme.accent} /> : <Users size={18} color={theme.muted} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: theme.text }}>{u.name}</span>
                            {u.pin_change_required && <span style={css.badge(theme.yellowSoft, theme.yellow)}>PIN pendiente</span>}
                          </div>
                          <p style={{ fontSize: 12, color: theme.muted }}>
                            @{u.username} · {uCars.length} vehículo{uCars.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => openEdit(u)} title="Editar usuario"
                          style={css.btnSm(theme.accentSoft, theme.accent)}><Edit2 size={12} /></button>
                        <button onClick={() => { setResetPinUser(u); setNewPin('') }} title="Restablecer PIN"
                          style={css.btnSm('rgba(59,130,246,0.12)', '#3b82f6')}><Key size={12} /></button>
                        {!isAdminUser && (
                          <>
                            <button onClick={() => handleForcePin(u.id, u.name)} title="Forzar cambio de PIN"
                              style={css.btnSm(theme.yellowSoft, theme.yellow)}><UserCog size={12} /></button>
                            <button onClick={() => handleDelete(u.id, u.name)} title="Eliminar"
                              style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }
              const admins = users.filter(u => u.role === 'admin')
              const regular = users.filter(u => u.role !== 'admin')
              return (
                <>
                  {/* Administradores */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <ShieldCheck size={15} color={theme.accent} />
                    <h3 style={{ ...css.h3, fontSize: 14 }}>Administradores</h3>
                    <span style={css.badge(theme.accentSoft, theme.accent)}>{admins.length}</span>
                  </div>
                  <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
                    {admins.length > 0
                      ? admins.map(renderUserCard)
                      : <p style={{ ...css.subtitle, padding: '8px 0' }}>No hay administradores.</p>}
                  </div>

                  {/* Usuarios */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Users size={15} color={theme.muted} />
                    <h3 style={{ ...css.h3, fontSize: 14 }}>Usuarios</h3>
                    <span style={css.badge(theme.greenSoft, theme.green)}>{regular.length}</span>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {regular.length > 0
                      ? regular.map(renderUserCard)
                      : <p style={{ ...css.subtitle, padding: '8px 0' }}>No hay usuarios normales todavía.</p>}
                  </div>
                </>
              )
            })()}

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Nuevo Usuario">
              <p style={{ ...css.subtitle, marginBottom: 16 }}>Se le pedirá cambiar el PIN en su primer inicio de sesión.</p>
              <Field label="Nombre"><input style={css.input} value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Nombre" /></Field>
              <Field label="Usuario"><input style={css.input} value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} placeholder="nombre_usuario" /></Field>
              <Field label="PIN temporal"><input style={css.input} inputMode="numeric" pattern="[0-9]*" value={newUser.pin} onChange={e => setNewUser(p => ({ ...p, pin: e.target.value.replace(/[^\d]/g, '') }))} placeholder="1234" /></Field>
              <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button onClick={() => setShowNew(false)} style={css.btnOutline}>Cancelar</button>
                <button onClick={handleAdd} disabled={saving} style={css.btn()}><Save size={14} /> {saving ? 'Creando...' : 'Crear'}</button>
              </div>
            </Modal>

            {/* Edit user modal */}
            <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Editar usuario">
              <Field label="Nombre">
                <input style={css.input} value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre" />
              </Field>
              <Field label="Usuario">
                <input style={css.input} value={editForm.username}
                  onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))} placeholder="nombre_usuario" />
              </Field>
              <Field label="Rol">
                <div style={{ display: 'flex', gap: 6 }}>
                  {['user', 'admin'].map(r => (
                    <button key={r} type="button" onClick={() => setEditForm(p => ({ ...p, role: r }))} style={{
                      ...css.btn(editForm.role === r ? (r === 'admin' ? theme.accent : theme.green) : theme.bg,
                                 editForm.role === r ? '#000' : theme.muted),
                      flex: 1, justifyContent: 'center',
                      border: `1px solid ${editForm.role === r ? (r === 'admin' ? theme.accent : theme.green) : theme.border}`,
                    }}>{r === 'admin' ? '🛡️ Admin' : '👤 Usuario'}</button>
                  ))}
                </div>
              </Field>
              <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button onClick={() => setEditUser(null)} style={css.btnOutline}>Cancelar</button>
                <button onClick={handleSaveEdit} disabled={saving} style={css.btn()}><Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </Modal>

            {/* Reset PIN modal */}
            <Modal open={!!resetPinUser} onClose={() => setResetPinUser(null)} title="Restablecer PIN">
              <p style={{ ...css.subtitle, marginBottom: 16 }}>
                Establece un PIN nuevo para <strong style={{ color: theme.text }}>{resetPinUser?.name}</strong>.
                Se le pedirá cambiarlo la próxima vez que entre.
              </p>
              <Field label="Nuevo PIN">
                <input style={css.input} inputMode="numeric" pattern="[0-9]*" type="text" value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="Mínimo 4 dígitos"
                  onKeyDown={e => e.key === 'Enter' && handleSaveResetPin()} />
              </Field>
              <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button onClick={() => setResetPinUser(null)} style={css.btnOutline}>Cancelar</button>
                <button onClick={handleSaveResetPin} disabled={saving || newPin.length < 4} style={css.btn()}><Key size={14} /> {saving ? 'Guardando...' : 'Restablecer'}</button>
              </div>
            </Modal>
          </>
        )}

        {/* ─── GRUPOS TAB ─── */}
        {tab === 'groups' && (
          <>
            <p style={{ ...css.subtitle, marginBottom: 16 }}>
              Solicitudes de grupo pendientes de aprobación. Al aprobar, el solicitante se convierte en administrador del grupo y puede invitar a más gente.
            </p>
            {pendingGroups.length === 0 ? (
              <div style={{ ...css.card, padding: 40, textAlign: 'center' }}>
                <Inbox size={40} color={theme.mutedLight} style={{ marginBottom: 12 }} />
                <p style={{ color: theme.muted, fontSize: 13 }}>No hay solicitudes pendientes</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {pendingGroups.map(g => (
                  <div key={g.id} style={{ ...css.card, padding: mob ? 14 : 18, marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: theme.yellowSoft, borderRadius: 0, padding: 10, display: 'flex' }}>
                          <Users size={20} color={theme.yellow} />
                        </div>
                        <div>
                          <h3 style={{ ...css.h3, marginBottom: 2 }}>{g.name}</h3>
                          <p style={{ fontSize: 12, color: theme.muted }}>
                            Solicitado por {g.profiles?.name || '—'} · {formatDate(g.created_at?.split('T')[0])}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleApproveGroup(g)} style={css.btn(theme.green, '#fff')}>
                          <Check size={14} /> Aprobar
                        </button>
                        <button onClick={() => handleRejectGroup(g)} style={css.btn(theme.redSoft, theme.red)}>
                          <X size={14} /> Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'stats' && (
          <>
            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(4, 1fr)', gap: mob ? 8 : 12, marginBottom: 20 }}>
              <Stat icon={<Users size={18} color={theme.accent} />} label="Usuarios" value={users.length} />
              <Stat icon={<Car size={18} color="#3b82f6" />} label="Vehículos" value={allCars.length} color="#3b82f6" />
              <Stat icon={<ShieldCheck size={18} color={theme.green} />} label="Mant. OK" value={stats.ok} color={theme.green} />
              <Stat icon={<BarChart3 size={18} color={theme.red} />} label="Mant. vencidos" value={stats.overdue} color={theme.red} />
            </div>

            {/* Cars per user chart */}
            {stats.carsPerUser.length > 0 && (
              <div style={{ ...css.card, padding: mob ? 12 : 20, marginBottom: 12 }}>
                <h3 style={{ ...css.h3, marginBottom: 16 }}>Vehículos por usuario</h3>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <BarChart data={stats.carsPerUser} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fill: theme.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: theme.muted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Vehículos" fill={theme.accent} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Vehicle types + maintenance status */}
            <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 12 }}>
              {stats.vehicleTypes.length > 0 && (
                <div style={{ ...css.card, padding: mob ? 12 : 20 }}>
                  <h3 style={{ ...css.h3, marginBottom: 16 }}>Tipos de vehículo</h3>
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={stats.vehicleTypes} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" stroke="none">
                          {stats.vehicleTypes.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
                    {stats.vehicleTypes.map((v, i) => (
                      <span key={v.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: theme.muted }}>
                        <span style={{ width: 10, height: 10, borderRadius: 0, background: COLORS[i], display: 'inline-block' }} />
                        {v.name}: {v.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {stats.total > 0 && (
                <div style={{ ...css.card, padding: mob ? 12 : 20 }}>
                  <h3 style={{ ...css.h3, marginBottom: 16 }}>Estado mantenimientos</h3>
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={[
                          { name: 'Al día', value: stats.ok },
                          { name: 'Próximos', value: stats.warn },
                          { name: 'Vencidos', value: stats.overdue },
                        ].filter(v => v.value > 0)} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" stroke="none">
                          <Cell fill={theme.green} />
                          <Cell fill={theme.yellow} />
                          <Cell fill={theme.red} />
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 4 }}>
                    {[{ l: 'OK', c: theme.green, v: stats.ok }, { l: 'Próx.', c: theme.yellow, v: stats.warn }, { l: 'Venc.', c: theme.red, v: stats.overdue }].map(x => (
                      <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: theme.muted }}>
                        <span style={{ width: 10, height: 10, borderRadius: 0, background: x.c, display: 'inline-block' }} />
                        {x.l}: {x.v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Total km */}
            <div style={{ ...css.card, padding: 16, marginTop: 12, textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: theme.muted }}>Kilómetros totales registrados</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: theme.accent }}>{stats.totalKm.toLocaleString()} km</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
