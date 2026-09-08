import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Save, Users, Car, Key, BarChart3, ShieldCheck, Edit2, Check, X, UserCog, Inbox } from 'lucide-react'
import AreaChart from './AreaChart.jsx'
import { theme, css } from '../lib/theme.js'
import { t, useLang, fmtNum } from '../lib/i18n.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { getProfiles, createProfile, deleteProfile, updateProfile, getCars, getMaintenanceRecords, getPendingGroups, approveGroup, rejectGroup } from '../lib/api.js'
import { getMaintStatus, formatDate } from '../lib/constants.js'
import { Modal, Field, Loader, Stat } from './ui.jsx'
import { useTwoCol, Panel, Row, AttentionList } from './TwoColumn.jsx'


export default function AdminPanel({ onToast }) {
  useLang()
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
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const handleAdd = async () => {
    if (!newUser.name || !newUser.username) return
    setSaving(true)
    try {
      await createProfile({ ...newUser, pin_change_required: true })
      setNewUser({ name: '', username: '', pin: '1234', role: 'user' })
      setShowNew(false); onToast(t('adm.userCreated')); loadAll()
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(t('adm.deleteUser', { name }))) return
    try { await deleteProfile(id); onToast(t('adm.userDeleted')); loadAll() }
    catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  const handleForcePin = async (id, name) => {
    if (!confirm(t('adm.forcePin', { name }))) return
    try { await updateProfile(id, { pin_change_required: true }); onToast(t('adm.forcePinDone', { name })); loadAll() }
    catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
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
      setEditUser(null); onToast(t('adm.userUpdated')); loadAll()
    } catch (err) { onToast(t('common.error') + ': ' + (err.message?.includes('duplicate') ? t('adm.userExists') : err.message), 'error') }
    finally { setSaving(false) }
  }

  const handleSaveResetPin = async () => {
    if (newPin.length < 4) return onToast(t('pin.errShort'), 'error')
    setSaving(true)
    try {
      // Reset PIN + force change on next login for security
      await updateProfile(resetPinUser.id, { pin: newPin, pin_change_required: true })
      setResetPinUser(null); setNewPin('')
      onToast(t('adm.pinReset')); loadAll()
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
    finally { setSaving(false) }
  }

  const handleApproveGroup = async (g) => {
    try { await approveGroup(g.id, g.created_by); onToast(t('adm.approved', { name: g.name })); loadAll() }
    catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  const handleRejectGroup = async (g) => {
    if (!confirm(t('adm.rejectConfirm', { name: g.name }))) return
    try { await rejectGroup(g.id); onToast(t('adm.reqRejected')); loadAll() }
    catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  // Stats
  const stats = useMemo(() => {
    const totalKm = allCars.reduce((s, c) => s + (c.current_km || 0), 0)
    let ok = 0, warn = 0, overdue = 0
    allMaint.forEach(m => { const s = getMaintStatus(m, m.currentKm); if (s === 'ok') ok++; else if (s === 'warn') warn++; else if (s === 'overdue') overdue++ })

    const carsPerUser = users.map(u => ({ name: u.name, count: allCars.filter(c => c.user_id === u.id).length }))
    const vehicleTypes = [
      { name: t('veh.coche'), value: allCars.filter(c => c.vehicle_type !== 'moto').length },
      { name: t('veh.moto'), value: allCars.filter(c => c.vehicle_type === 'moto').length },
    ].filter(v => v.value > 0)

    return { totalKm, ok, warn, overdue, total: ok + warn + overdue, carsPerUser, vehicleTypes }
  }, [users, allCars, allMaint])

  const { two } = useTwoCol()

  if (loading) return <Loader text={t('common.loading')} />

  const tabs = [
    { id: 'users', icon: <Users size={14} />, label: t('adm.users') },
    { id: 'groups', icon: <Inbox size={14} />, label: t('grp.title'), badge: pendingGroups.length > 0 ? pendingGroups.length : null },
    { id: 'stats', icon: <BarChart3 size={14} />, label: t('adm.stats') },
  ]

  return (
    <div style={css.container}>
      <div style={{ paddingTop: mob ? 20 : 28, paddingBottom: 40 }}>
        <h1 style={{ ...css.h1, fontSize: mob ? 22 : 26, marginBottom: 20 }}>{t('adm.title')}</h1>

        {/* Tres columnas cuando hay sitio: menú, contenido y lo que
            hay que atender. Debajo de 1024 se apila y el menú
            vuelve a ser una tira. */}
        <div style={two ? {
          display: 'grid',
          gridTemplateColumns: 'minmax(170px, 200px) minmax(0, 1fr) 290px',
          gap: 14, alignItems: 'start',
        } : null}>

        {/* El menú: una tira arriba cuando no hay sitio, y una
            columna a la izquierda cuando lo hay. Es el mismo botón
            con la caja puesta de otra manera. */}
        <div style={{
          display: 'flex',
          flexDirection: two ? 'column' : 'row',
          gap: 4, marginBottom: two ? 0 : 20,
          background: theme.bg, padding: 4,
          ...(two ? { position: 'sticky', top: `calc(68px + var(--pm-banner, 0px))` } : null),
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: mob ? 4 : 5,
              flex: two ? 'none' : 1,
              justifyContent: two ? 'flex-start' : 'center', minWidth: 0,
              background: tab === t.id ? theme.card : 'transparent', color: tab === t.id ? theme.text : theme.muted,
              border: tab === t.id ? `1px solid ${theme.border}` : '1px solid transparent',
              borderRadius: 0, padding: mob ? '8px 4px' : '10px 12px', cursor: 'pointer', fontWeight: 600,
              fontSize: mob ? 12 : 13, fontFamily: 'inherit', whiteSpace: 'nowrap',
              textAlign: 'left',
            }}>
              {t.icon}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: two ? 1 : 'none' }}>{t.label}</span>
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

        <div style={{ minWidth: 0 }}>
        {tab === 'users' && (
          <>
            <div style={{ ...css.flexBetween, marginBottom: 16, gap: 12 }}>
              <p style={css.subtitle}>
                {t('adm.adminCount', { n: users.filter(u => u.role === 'admin').length })} · {t('adm.userCount', { n: users.filter(u => u.role !== 'admin').length })}
              </p>
              <button onClick={() => setShowNew(true)} style={css.btn()}><Plus size={16} /> {mob ? t('common.new') : t('adm.newUser')}</button>
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
                            {u.pin_change_required && <span style={css.badge(theme.yellowSoft, theme.yellow)}>{t('adm.pinPending')}</span>}
                          </div>
                          <p style={{ fontSize: 12, color: theme.muted }}>
                            @{u.username} · {uCars.length === 1 ? t('common.vehCount1') : t('common.vehCount', { n: uCars.length })}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => openEdit(u)} title={t('adm.editUser')}
                          style={css.btnSm(theme.accentSoft, theme.accent)}><Edit2 size={12} /></button>
                        <button onClick={() => { setResetPinUser(u); setNewPin('') }} title="Restablecer PIN"
                          style={css.btnSm('rgba(59,130,246,0.12)', theme.accent)}><Key size={12} /></button>
                        {!isAdminUser && (
                          <>
                            <button onClick={() => handleForcePin(u.id, u.name)} title="Forzar cambio de PIN"
                              style={css.btnSm(theme.yellowSoft, theme.yellow)}><UserCog size={12} /></button>
                            <button onClick={() => handleDelete(u.id, u.name)} title={t('common.delete')}
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
                    <h3 style={{ ...css.h3, fontSize: 14 }}>{t('adm.admins')}</h3>
                    <span style={css.badge(theme.accentSoft, theme.accent)}>{admins.length}</span>
                  </div>
                  <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
                    {admins.length > 0
                      ? admins.map(renderUserCard)
                      : <p style={{ ...css.subtitle, padding: '8px 0' }}>{t('adm.noAdmins')}</p>}
                  </div>

                  {/* Usuarios */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Users size={15} color={theme.muted} />
                    <h3 style={{ ...css.h3, fontSize: 14 }}>{t('adm.users')}</h3>
                    <span style={css.badge(theme.greenSoft, theme.green)}>{regular.length}</span>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {regular.length > 0
                      ? regular.map(renderUserCard)
                      : <p style={{ ...css.subtitle, padding: '8px 0' }}>{t('adm.noUsers')}</p>}
                  </div>
                </>
              )
            })()}

            <Modal open={showNew} onClose={() => setShowNew(false)} title={t('adm.newUser')}>
              <p style={{ ...css.subtitle, marginBottom: 16 }}>{t('adm.pinNote')}</p>
              <Field label={t('common.name')}><input style={css.input} value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder={t('adm.namePh')} /></Field>
              <Field label={t('common.user')}><input style={css.input} value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} placeholder={t('adm.userPh')} /></Field>
              <Field label="PIN temporal"><input style={css.input} inputMode="numeric" pattern="[0-9]*" value={newUser.pin} onChange={e => setNewUser(p => ({ ...p, pin: e.target.value.replace(/[^\d]/g, '') }))} placeholder="1234" /></Field>
              <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button onClick={() => setShowNew(false)} style={css.btnOutline}>{t('common.cancel')}</button>
                <button onClick={handleAdd} disabled={saving} style={css.btn()}><Save size={14} /> {saving ? t('common.saving') : t('common.create')}</button>
              </div>
            </Modal>

            {/* Edit user modal */}
            <Modal open={!!editUser} onClose={() => setEditUser(null)} title={t('adm.editUser')}>
              <Field label={t('common.name')}>
                <input style={css.input} value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder={t('adm.namePh')} />
              </Field>
              <Field label={t('common.user')}>
                <input style={css.input} value={editForm.username}
                  onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))} placeholder={t('adm.userPh')} />
              </Field>
              <Field label="Rol">
                <div style={{ display: 'flex', gap: 6 }}>
                  {['user', 'admin'].map(r => (
                    <button key={r} type="button" onClick={() => setEditForm(p => ({ ...p, role: r }))} style={{
                      ...css.btn(editForm.role === r ? (r === 'admin' ? theme.accent : theme.green) : theme.bg,
                                 editForm.role === r ? '#000' : theme.muted),
                      flex: 1, justifyContent: 'center',
                      border: `1px solid ${editForm.role === r ? (r === 'admin' ? theme.accent : theme.green) : theme.border}`,
                    }}>{r === 'admin' ? t('adm.roleAdmin') : t('adm.roleUser')}</button>
                  ))}
                </div>
              </Field>
              <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button onClick={() => setEditUser(null)} style={css.btnOutline}>{t('common.cancel')}</button>
                <button onClick={handleSaveEdit} disabled={saving} style={css.btn()}><Save size={14} /> {saving ? t('common.saving') : t('common.save')}</button>
              </div>
            </Modal>

            {/* Reset PIN modal */}
            <Modal open={!!resetPinUser} onClose={() => setResetPinUser(null)} title="Restablecer PIN">
              <p style={{ ...css.subtitle, marginBottom: 16 }}>
                {t('adm.resetPinFor', { name: resetPinUser?.name || '' })}
                {' '}{t('adm.resetPinNote')}
              </p>
              <Field label={t('pin.new')}>
                <input style={css.input} inputMode="numeric" pattern="[0-9]*" type="text" value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder={t('pin.min')}
                  onKeyDown={e => e.key === 'Enter' && handleSaveResetPin()} />
              </Field>
              <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button onClick={() => setResetPinUser(null)} style={css.btnOutline}>{t('common.cancel')}</button>
                <button onClick={handleSaveResetPin} disabled={saving || newPin.length < 4} style={css.btn()}><Key size={14} /> {saving ? 'Guardando...' : 'Restablecer'}</button>
              </div>
            </Modal>
          </>
        )}

        {/* ─── GRUPOS TAB ─── */}
        {tab === 'groups' && (
          <>
            <p style={{ ...css.subtitle, marginBottom: 16 }}>
              {t('adm.reqHelp')}
            </p>
            {pendingGroups.length === 0 ? (
              <div style={{ ...css.card, padding: 40, textAlign: 'center' }}>
                <Inbox size={40} color={theme.mutedLight} style={{ marginBottom: 12 }} />
                <p style={{ color: theme.muted, fontSize: 13 }}>{t('adm.noRequests')}</p>
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
                            {t('adm.requestedBy', { name: g.profiles?.name || '—' })} · {formatDate(g.created_at?.split('T')[0])}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleApproveGroup(g)} style={css.btn(theme.green, '#fff')}>
                          <Check size={14} /> {t('adm.approve')}
                        </button>
                        <button onClick={() => handleRejectGroup(g)} style={css.btn(theme.redSoft, theme.red)}>
                          <X size={14} /> {t('adm.reject')}
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
              <Stat icon={<Users size={18} color={theme.accent} />} label={t('adm.users')} value={users.length} />
              <Stat icon={<Car size={18} color={theme.accent} />} label={t('common.vehicles')} value={allCars.length} />
              <Stat icon={<ShieldCheck size={18} color={theme.green} />} label="Mant. OK" value={stats.ok} color={theme.green} />
              <Stat icon={<BarChart3 size={18} color={theme.red} />} label={t('adm.overdueMaint')} value={stats.overdue} color={theme.red} />
            </div>

            {/* Cars per user chart */}
            {stats.carsPerUser.length > 0 && (
              <div style={{ ...css.card, padding: mob ? 12 : 20, marginBottom: 12 }}>
                <h3 style={{ ...css.h3, marginBottom: 16 }}>{t('adm.perUser')}</h3>
                <AreaChart
                  data={stats.carsPerUser.map(u => ({ label: u.name, total: u.count }))}
                  height={200}
                  format={fmtNum}
                  showLabels
                />
              </div>
            )}

            {/* Vehicle types + maintenance status */}
            <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 12 }}>
              {stats.vehicleTypes.length > 0 && (
                <div style={{ ...css.card, padding: mob ? 12 : 20 }}>
                  <h3 style={{ ...css.h3, marginBottom: 16 }}>{t('adm.vehicleTypes')}</h3>
                  <AreaChart
                    data={stats.vehicleTypes.map(v => ({ label: v.name, total: v.value }))}
                    height={170}
                    format={fmtNum}
                  />
                  {/* Sin tarta ya no hay un color por tipo, así que la
                      leyenda se queda en nombre y cuenta. */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                    {stats.vehicleTypes.map(v => (
                      <span key={v.name} style={{ ...css.lbl, fontSize: 9 }}>
                        {v.name} <span style={{ ...css.num, color: theme.white }}>{fmtNum(v.value)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {stats.total > 0 && (
                <div style={{ ...css.card, padding: mob ? 12 : 20 }}>
                  <h3 style={{ ...css.h3, marginBottom: 16 }}>{t('adm.maintState')}</h3>
                  {/* Aquí el color no es una serie sino un estado, y eso
                      lo dice la leyenda de abajo: el área va en el
                      acento como el resto. */}
                  <AreaChart
                    data={[
                      { label: t('adm.upToDate'), total: stats.ok },
                      { label: t('adm.upcoming'), total: stats.warn },
                      { label: t('adm.overdue'), total: stats.overdue },
                    ]}
                    height={170}
                    format={fmtNum}
                  />
                  {/* El color va en la cifra, no en un cuadrado: aquí
                      verde, ámbar y rojo son el estado, y un cuadrado
                      debajo de un gráfico se lee como su leyenda. */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 10 }}>
                    {[{ l: t('status.ok'), c: theme.green, v: stats.ok }, { l: t('adm.upcomingShort'), c: theme.yellow, v: stats.warn }, { l: t('adm.overdueShort'), c: theme.red, v: stats.overdue }].map(x => (
                      <span key={x.l} style={{ ...css.lbl, fontSize: 9 }}>
                        {x.l} <span style={{ ...css.num, fontSize: 12, color: x.c }}>{fmtNum(x.v)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Total km */}
            <div style={{ ...css.card, padding: 16, marginTop: 12, textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: theme.muted }}>{t('adm.totalKm')}</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: theme.accent }}>{fmtNum(stats.totalKm)} km</div>
            </div>
          </>
        )}
        </div>

        {two && (
          <aside style={{
            position: 'sticky',
            top: `calc(68px + var(--pm-banner, 0px))`,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <Panel
              title={t('adm.requests')}
              right={pendingGroups.length || null}
              onClick={() => setTab('groups')}
            >
              <AttentionList
                empty={t('adm.noRequests')}
                items={pendingGroups.slice(0, 5).map(g => ({
                  key: g.id,
                  title: g.name,
                  sub: g.profiles?.name || t('common.unknown'),
                  color: theme.yellow,
                }))}
              />
            </Panel>

            <Panel title={t('adm.fleet')}>
              <Row label={t('adm.users')} value={fmtNum(users.length)} />
              <Row label={t('common.vehicles')} value={fmtNum(allCars.length)} />
              <Row label={t('status.ok')} value={fmtNum(stats.ok)} color={theme.green} />
              <Row label={t('adm.upcomingShort')} value={fmtNum(stats.warn)} color={stats.warn ? theme.yellow : theme.muted} />
              <Row label={t('adm.overdueShort')} value={fmtNum(stats.overdue)} color={stats.overdue ? theme.red : theme.muted} />
              <Row label={t('adm.totalKm')} value={fmtNum(stats.totalKm)} />
            </Panel>
          </aside>
        )}
        </div>
      </div>
    </div>
  )
}
