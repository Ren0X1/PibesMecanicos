import { useState, useEffect, useRef } from 'react'
import {
  Users, Plus, Trash2, Save, ChevronLeft, Send, MessageCircle,
  Car, UserPlus, X, Gauge, Calendar, Settings as SettingsIcon, Fuel, Eye,
  Crown, Clock, Check, Mail, Inbox, Sparkles
} from 'lucide-react'
import { theme, css } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import {
  getGroups, createGroup, requestGroup, deleteGroup, getGroupMembers,
  removeGroupMember, getGroupMessages, sendGroupMessage, getProfiles, getMemberCars,
  getMaintenanceRecords, getCarParts, getItvRecords, getFuelLogs,
  inviteToGroup, getMyInvitations, getGroupInvitations, acceptInvitation, rejectInvitation
} from '../lib/api.js'
import { getMaintStatus, MAINT_TYPES } from '../lib/constants.js'
import { Modal, Field, Loader, StatusBadge } from './ui.jsx'

function calcAvgConsumption(logs) {
  if (logs.length < 2) return null
  const sorted = [...logs].sort((a, b) => a.km - b.km)
  const consumptions = []
  for (let i = 1; i < sorted.length; i++) {
    const kmDiff = sorted[i].km - sorted[i - 1].km
    if (kmDiff > 0) consumptions.push((sorted[i].liters / kmDiff) * 100)
  }
  return consumptions.length > 0 ? +(consumptions.reduce((s, v) => s + v, 0) / consumptions.length).toFixed(1) : null
}

/* ── Read-only Car Viewer ── */
function CarViewer({ car, onClose, isMobile }) {
  const [maint, setMaint] = useState([])
  const [parts, setParts] = useState([])
  const [itv, setItv] = useState([])
  const [fuelLogs, setFuelLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMaintenanceRecords(car.id), getCarParts(car.id), getItvRecords(car.id), getFuelLogs(car.id)])
      .then(([m, p, i, f]) => { setMaint(m); setParts(p); setItv(i); setFuelLogs(f) })
      .finally(() => setLoading(false))
  }, [car.id])

  if (loading) return <Loader text="Cargando..." />

  const latest_itv = itv[0]
  let overdue = 0, warn = 0
  maint.forEach(m => { const s = getMaintStatus(m, car.current_km); if (s === 'overdue') overdue++; if (s === 'warn') warn++ })
  const avgConsumption = calcAvgConsumption(fuelLogs)

  return (
    <div>
      <button onClick={onClose} style={{ ...css.btnOutline, marginBottom: 12, fontSize: 12 }}><ChevronLeft size={14} /> Volver</button>
      <div style={{ ...css.card, padding: isMobile ? 14 : 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <h3 style={{ ...css.h2, fontSize: 18 }}>{car.vehicle_type === 'moto' ? '🏍️' : '🚗'} {car.brand} {car.model}</h3>
          <span style={css.badge(theme.accentSoft, theme.accent)}>{car.plate}</span>
          <span style={{ ...css.flex, gap: 4, fontSize: 12, color: theme.muted }}><Gauge size={13} />{car.current_km?.toLocaleString()} km</span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: theme.muted, flexWrap: 'wrap' }}>
          <span><Calendar size={12} /> {car.year}</span>
          <span><SettingsIcon size={12} /> {car.transmission}</span>
          <span><Fuel size={12} /> {car.fuel}</span>
          {overdue > 0 && <span style={css.badge(theme.redSoft, theme.red)}>⚠ {overdue} vencidos</span>}
          {warn > 0 && <span style={css.badge(theme.yellowSoft, theme.yellow)}>⏳ {warn} próximos</span>}
          {latest_itv && <span style={css.badge(
            latest_itv.result === 'favorable' ? theme.greenSoft : theme.yellowSoft,
            latest_itv.result === 'favorable' ? theme.green : theme.yellow
          )}>ITV: {latest_itv.result}</span>}
          {avgConsumption && <span style={css.badge('rgba(59,130,246,0.12)', '#3b82f6')}>⛽ {avgConsumption} L/100</span>}
        </div>
      </div>

      {maint.length > 0 && (
        <div style={{ ...css.card, padding: 0, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, fontSize: 13, fontWeight: 600 }}>Mantenimientos</div>
          {maint.map(m => {
            const mt = MAINT_TYPES.find(t => t.id === m.type_id)
            const status = getMaintStatus(m, car.current_km)
            return (
              <div key={m.id} style={{ padding: '8px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span>{mt?.emoji} {mt?.name || m.type_id}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: theme.muted }}>{m.next_km?.toLocaleString()} km</span>
                  <StatusBadge status={status} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {parts.length > 0 && (
        <div style={{ ...css.card, padding: 0, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, fontSize: 13, fontWeight: 600 }}>Recambios</div>
          {parts.map(p => (
            <div key={p.id} style={{ padding: '8px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span style={css.badge('rgba(59,130,246,0.12)', '#3b82f6')}>{p.reference || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Group Detail ── */
function GroupDetail({ group, user, onBack, onToast, isMobile }) {
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [messages, setMessages] = useState([])
  const [allProfiles, setAllProfiles] = useState([])
  const [memberCars, setMemberCars] = useState({})
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [viewingCar, setViewingCar] = useState(null)
  const [tab, setTab] = useState('chat')
  const [loading, setLoading] = useState(true)
  const chatEnd = useRef(null)

  // Group admin = creator of the group. Site admin can also manage.
  const isGroupAdmin = group.created_by === user.id || user.role === 'admin'

  const load = async () => {
    try {
      const [mem, msgs, profiles, invs] = await Promise.all([
        getGroupMembers(group.id), getGroupMessages(group.id), getProfiles(),
        getGroupInvitations(group.id),
      ])
      setMembers(mem); setMessages(msgs); setAllProfiles(profiles); setInvitations(invs)
      const cars = {}
      for (const m of mem) { cars[m.user_id] = await getMemberCars(m.user_id) }
      setMemberCars(cars)
    } catch (err) { onToast('Error: ' + err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [group.id])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const interval = setInterval(async () => {
      try { setMessages(await getGroupMessages(group.id)) } catch {}
    }, 10000)
    return () => clearInterval(interval)
  }, [group.id])

  const handleSend = async () => {
    if (!newMsg.trim()) return
    setSending(true)
    try {
      const msg = await sendGroupMessage(group.id, user.id, newMsg.trim())
      setMessages(prev => [...prev, msg]); setNewMsg('')
    } catch (err) { onToast('Error: ' + err.message, 'error') }
    finally { setSending(false) }
  }

  const handleInvite = async (userId) => {
    try {
      await inviteToGroup(group.id, userId, user.id)
      setShowInvite(false); onToast('Invitación enviada'); load()
    } catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const handleRemoveMember = async (userId) => {
    if (!confirm('¿Eliminar del grupo?')) return
    try { await removeGroupMember(group.id, userId); onToast('Miembro eliminado'); load() }
    catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  if (loading) return <Loader text="Cargando grupo..." />
  if (viewingCar) return <CarViewer car={viewingCar} onClose={() => setViewingCar(null)} isMobile={isMobile} />

  // Users not in the group and without a pending invite
  const invitedIds = invitations.map(i => i.user_id)
  const invitable = allProfiles.filter(p => !members.find(m => m.user_id === p.id) && !invitedIds.includes(p.id))

  const tabs = [
    { id: 'chat', icon: <MessageCircle size={15} />, label: 'Chat' },
    { id: 'cars', icon: <Car size={15} />, label: 'Vehículos' },
    { id: 'members', icon: <Users size={15} />, label: `${members.length}` },
  ]

  return (
    <div>
      <button onClick={onBack} style={{ ...css.btnOutline, marginBottom: 12 }}><ChevronLeft size={16} /> Grupos</button>

      {/* Group header card */}
      <div style={{
        ...css.card, padding: isMobile ? 16 : 20, marginBottom: 16,
        background: `linear-gradient(135deg, ${theme.accentSoft}, ${theme.card})`,
        border: `1px solid ${theme.accent}33`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: theme.accent, borderRadius: 0, padding: 12, display: 'flex' }}>
            <Users size={24} color="#000" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ ...css.h1, fontSize: isMobile ? 20 : 24, marginBottom: 2 }}>{group.name}</h2>
            <p style={{ fontSize: 12, color: theme.muted }}>
              {members.length} miembro{members.length !== 1 ? 's' : ''}
              {group.created_by === user.id && <span style={{ color: theme.accent, fontWeight: 600 }}> · Eres el admin</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: theme.bg, borderRadius: 0, padding: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 5, flex: 1, justifyContent: 'center',
            background: tab === t.id ? theme.card : 'transparent', color: tab === t.id ? theme.white : theme.muted,
            border: tab === t.id ? `1px solid ${theme.border}` : '1px solid transparent',
            borderRadius: 0, padding: isMobile ? '10px 12px' : '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Chat Tab */}
      {tab === 'chat' && (
        <div style={{ ...css.card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100vh - 320px)' : 480 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {messages.length === 0 && <p style={{ color: theme.muted, textAlign: 'center', padding: 40, fontSize: 13 }}>Sin mensajes aún. ¡Escribe el primero!</p>}
            {messages.map(m => {
              const isMe = m.user_id === user.id
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                  <div style={{
                    maxWidth: '75%', padding: '8px 12px', borderRadius: 0,
                    background: isMe ? theme.accent : theme.bg,
                    color: isMe ? '#000' : theme.text,
                    borderBottomRightRadius: isMe ? 4 : 14, borderBottomLeftRadius: isMe ? 14 : 4,
                  }}>
                    {!isMe && <div style={{ fontSize: 11, fontWeight: 700, color: theme.accent, marginBottom: 2 }}>{m.profiles?.name}</div>}
                    <div style={{ fontSize: 13, wordBreak: 'break-word' }}>{m.message}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2, textAlign: 'right' }}>
                      {new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={chatEnd} />
          </div>
          <div style={{ borderTop: `1px solid ${theme.border}`, padding: 10, display: 'flex', gap: 8 }}>
            <input style={{ ...css.input, flex: 1 }} value={newMsg} onChange={e => setNewMsg(e.target.value)}
              placeholder="Escribe un mensaje..."
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()} />
            <button onClick={handleSend} disabled={sending || !newMsg.trim()}
              style={{ ...css.btn(), padding: '8px 14px', opacity: !newMsg.trim() ? 0.5 : 1 }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Cars Tab */}
      {tab === 'cars' && (
        <div>
          {members.every(m => (memberCars[m.user_id] || []).length === 0) && (
            <div style={{ ...css.card, padding: 40, textAlign: 'center' }}>
              <Car size={36} color={theme.mutedLight} style={{ marginBottom: 10 }} />
              <p style={{ color: theme.muted, fontSize: 13 }}>Ningún miembro tiene vehículos todavía</p>
            </div>
          )}
          {members.map(m => {
            const cars = memberCars[m.user_id] || []
            const profile = m.profiles
            if (cars.length === 0) return null
            return (
              <div key={m.user_id} style={{ marginBottom: 16 }}>
                <h3 style={{ ...css.h3, marginBottom: 8, fontSize: 14 }}>
                  🔧 Vehículos de {profile?.name || 'Usuario'}
                  {m.user_id === user.id && <span style={{ color: theme.muted, fontWeight: 400 }}> (tú)</span>}
                </h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {cars.map(car => (
                    <div key={car.id} onClick={() => setViewingCar(car)}
                      style={{ ...css.card, padding: isMobile ? 12 : 16, cursor: 'pointer', marginBottom: 0, transition: 'all .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{car.vehicle_type === 'moto' ? '🏍️' : '🚗'} {car.brand} {car.model}</span>
                            <span style={css.badge(theme.accentSoft, theme.accent)}>{car.plate}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 12, color: theme.muted }}>
                            <span>{car.current_km?.toLocaleString()} km</span>
                            <span>{car.year}</span>
                            <span>{car.fuel}</span>
                          </div>
                        </div>
                        <Eye size={16} color={theme.muted} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div>
          {isGroupAdmin && (
            <button onClick={() => setShowInvite(true)} style={{ ...css.btn(), marginBottom: 12 }}>
              <UserPlus size={14} /> Invitar gente
            </button>
          )}

          {/* Members */}
          <div style={{ display: 'grid', gap: 8 }}>
            {members.map(m => {
              const isGroupOwner = m.user_id === group.created_by
              return (
                <div key={m.id} style={{ ...css.card, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: isGroupOwner ? theme.accentSoft : theme.bg, borderRadius: 0, padding: 8, display: 'flex' }}>
                      {isGroupOwner ? <Crown size={16} color={theme.accent} /> : <Users size={16} color={theme.muted} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{m.profiles?.name}</span>
                        {isGroupOwner && <span style={css.badge(theme.accentSoft, theme.accent)}>Admin</span>}
                        {m.user_id === user.id && <span style={{ color: theme.muted, fontSize: 12 }}>(tú)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>
                        @{m.profiles?.username} · {(memberCars[m.user_id] || []).length} vehículo{(memberCars[m.user_id] || []).length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  {isGroupAdmin && m.user_id !== group.created_by && (
                    <button onClick={() => handleRemoveMember(m.user_id)} style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pending invitations */}
          {isGroupAdmin && invitations.length > 0 && (
            <>
              <h3 style={{ ...css.h3, fontSize: 13, marginTop: 20, marginBottom: 8, color: theme.muted }}>
                <Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Invitaciones pendientes ({invitations.length})
              </h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {invitations.map(inv => (
                  <div key={inv.id} style={{ ...css.card, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, opacity: 0.85 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{inv.profiles?.name}</span>
                      <span style={{ color: theme.muted, fontSize: 12, marginLeft: 8 }}>@{inv.profiles?.username}</span>
                    </div>
                    <span style={css.badge(theme.yellowSoft, theme.yellow)}><Clock size={10} /> Esperando</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Invite modal */}
          <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invitar gente">
            <p style={{ ...css.subtitle, marginBottom: 12 }}>La persona recibirá una invitación y decide si entra o no.</p>
            {invitable.length === 0 ? (
              <p style={{ color: theme.muted, textAlign: 'center', padding: 20 }}>No hay nadie más a quien invitar</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {invitable.map(p => (
                  <div key={p.id} style={{ ...css.card, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span style={{ color: theme.muted, fontSize: 12, marginLeft: 8 }}>@{p.username}</span>
                    </div>
                    <button onClick={() => handleInvite(p.id)} style={css.btnSm(theme.accent, '#000')}><Mail size={12} /> Invitar</button>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        </div>
      )}
    </div>
  )
}

/* ── Main Groups Page ── */
export default function Groups({ user, onToast }) {
  const mob = useIsMobile()
  const [groups, setGroups] = useState([])
  const [invitations, setInvitations] = useState([])
  const [memberCounts, setMemberCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeGroup, setActiveGroup] = useState(null)
  const isAdmin = user.role === 'admin'

  const load = async () => {
    try {
      const [gs, invs] = await Promise.all([getGroups(user.id), getMyInvitations(user.id)])
      setGroups(gs)
      setInvitations(invs)
      // Member counts
      const counts = {}
      for (const g of gs) {
        try { counts[g.id] = (await getGroupMembers(g.id)).length } catch { counts[g.id] = 0 }
      }
      setMemberCounts(counts)
    } catch (err) { onToast('Error: ' + err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      if (isAdmin) {
        await createGroup(newName.trim(), user.id)
        onToast('Grupo creado')
      } else {
        await requestGroup(newName.trim(), user.id)
        onToast('Solicitud enviada — un admin la revisará')
      }
      setNewName(''); setShowNew(false); load()
    } catch (err) { onToast('Error: ' + err.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este grupo y todos sus mensajes?')) return
    try { await deleteGroup(id); onToast('Grupo eliminado'); load() }
    catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const handleAcceptInvite = async (inv) => {
    try { await acceptInvitation(inv.id, inv.group_id, user.id); onToast(`Te has unido a "${inv.groups?.name}"`); load() }
    catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  const handleRejectInvite = async (inv) => {
    try { await rejectInvitation(inv.id); onToast('Invitación rechazada'); load() }
    catch (err) { onToast('Error: ' + err.message, 'error') }
  }

  if (loading) return <Loader text="Cargando grupos..." />

  if (activeGroup) {
    return (
      <div style={css.container}>
        <div style={{ paddingTop: mob ? 16 : 24, paddingBottom: 40 }}>
          <GroupDetail group={activeGroup} user={user} onBack={() => { setActiveGroup(null); load() }} onToast={onToast} isMobile={mob} />
        </div>
      </div>
    )
  }

  return (
    <div style={css.container}>
      <div style={{ paddingTop: mob ? 20 : 28, paddingBottom: 40 }}>
        <div style={{ ...css.flexBetween, marginBottom: 20, gap: 12 }}>
          <div>
            <h1 style={{ ...css.h1, fontSize: mob ? 22 : 26 }}>Grupos</h1>
            <p style={css.subtitle}>Comparte tus vehículos y chatea con tu gente</p>
          </div>
          <button onClick={() => setShowNew(true)} style={css.btn()}>
            <Plus size={16} /> {isAdmin ? 'Crear grupo' : 'Solicitar grupo'}
          </button>
        </div>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ ...css.h3, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Inbox size={16} color={theme.accent} /> Invitaciones ({invitations.length})
            </h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {invitations.map(inv => (
                <div key={inv.id} style={{
                  ...css.card, padding: mob ? 14 : 18, marginBottom: 0,
                  background: `linear-gradient(135deg, ${theme.accentSoft}, ${theme.card})`,
                  border: `1px solid ${theme.accent}44`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ background: theme.accent, borderRadius: 0, padding: 10, display: 'flex' }}>
                        <Sparkles size={20} color="#000" />
                      </div>
                      <div>
                        <h3 style={{ ...css.h3, marginBottom: 2 }}>{inv.groups?.name}</h3>
                        <p style={{ fontSize: 12, color: theme.muted }}>
                          Te ha invitado {inv.inviter?.name || inv.groups?.profiles?.name || 'alguien'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleAcceptInvite(inv)} style={css.btn(theme.green, '#fff')}>
                        <Check size={14} /> Unirme
                      </button>
                      <button onClick={() => handleRejectInvite(inv)} style={css.btn(theme.redSoft, theme.red)}>
                        <X size={14} /> Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My groups */}
        {groups.length === 0 ? (
          <div style={{ ...css.card, padding: 48, textAlign: 'center' }}>
            <div style={{ background: theme.accentSoft, borderRadius: 0, padding: 16, display: 'inline-flex', marginBottom: 14 }}>
              <Users size={36} color={theme.accent} />
            </div>
            <h3 style={{ ...css.h3, marginBottom: 6 }}>Aún no estás en ningún grupo</h3>
            <p style={{ color: theme.muted, fontSize: 13, maxWidth: 320, margin: '0 auto 16px' }}>
              {isAdmin
                ? 'Crea un grupo para compartir vehículos y chatear con tu gente.'
                : 'Solicita crear un grupo (lo aprobará un admin) o espera a que alguien te invite.'}
            </p>
            <button onClick={() => setShowNew(true)} style={css.btn()}>
              <Plus size={14} /> {isAdmin ? 'Crear grupo' : 'Solicitar grupo'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
            {groups.map(g => {
              const isOwner = g.created_by === user.id
              const count = memberCounts[g.id] || 0
              return (
                <div key={g.id} onClick={() => setActiveGroup(g)}
                  style={{ ...css.card, padding: mob ? 16 : 20, cursor: 'pointer', transition: 'all .15s', marginBottom: 0, position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ background: theme.accentSoft, borderRadius: 0, padding: 11, display: 'flex' }}>
                      <Users size={22} color={theme.accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <h3 style={{ ...css.h3, fontSize: 16 }}>{g.name}</h3>
                        {isOwner && <span style={css.badge(theme.accentSoft, theme.accent)}><Crown size={10} /> Admin</span>}
                      </div>
                      <p style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>
                        Creado por {g.profiles?.name || 'admin'}
                      </p>
                    </div>
                    {isAdmin && (
                      <button onClick={e => { e.stopPropagation(); handleDelete(g.id) }}
                        style={css.btnSm(theme.redSoft, theme.red)}><Trash2 size={12} /></button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: theme.muted, borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Users size={13} /> {count} miembro{count !== 1 ? 's' : ''}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MessageCircle size={13} /> Chat
                    </span>
                    <span style={{ marginLeft: 'auto', color: theme.accent, fontWeight: 600 }}>Abrir →</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title={isAdmin ? 'Nuevo grupo' : 'Solicitar grupo'}>
        {!isAdmin && (
          <p style={{ ...css.subtitle, marginBottom: 12 }}>
            Tu solicitud la revisará un administrador. Si la aprueba, serás el admin del grupo y podrás invitar a quien quieras.
          </p>
        )}
        <Field label="Nombre del grupo">
          <input style={css.input} value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Ej: Los Pibes" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()} />
        </Field>
        <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
          <button onClick={() => setShowNew(false)} style={css.btnOutline}>Cancelar</button>
          <button onClick={handleCreate} disabled={saving} style={css.btn()}>
            <Save size={14} /> {saving ? 'Enviando...' : (isAdmin ? 'Crear' : 'Solicitar')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
