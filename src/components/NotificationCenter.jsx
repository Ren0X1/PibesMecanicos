import { useState, useEffect, useRef } from 'react'
import { Bell, X, AlertTriangle, Clock, ShieldAlert, ChevronRight, BellOff, Undo2, EyeOff, Eye } from 'lucide-react'
import { theme, css } from '../lib/theme.js'
import { getCars, getMaintenanceRecords, getItvRecords, getReminders, getMyInvitations } from '../lib/api.js'
import { MAINT_TYPES, getMaintStatus, formatDate } from '../lib/constants.js'
import { t, useLang } from '../lib/i18n.js'
import { getSnoozed, snooze, unsnooze, daysLeft, SNOOZE_DAYS } from '../lib/snooze.js'

export default function NotificationCenter({ userId, isMobile, dataVersion }) {
  useLang()
  const [alerts, setAlerts] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [snoozedMap, setSnoozedMap] = useState(() => getSnoozed(userId))
  const [showHidden, setShowHidden] = useState(false)
  const ref = useRef(null)

  /* Descartar no borra: esconde diez días y luego vuelve solo. */
  const hide = (id) => { snooze(userId, id); setSnoozedMap(getSnoozed(userId)) }
  const unhide = (id) => { unsnooze(userId, id); setSnoozedMap(getSnoozed(userId)) }

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 60000)
    return () => clearInterval(interval)
  }, [userId, dataVersion])

  // Close on click outside
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const loadAlerts = async () => {
    try {
      const cars = await getCars(userId)
      const allAlerts = []

      for (const car of cars) {
        const [maint, itv] = await Promise.all([
          getMaintenanceRecords(car.id),
          getItvRecords(car.id),
        ])

        const vEmoji = car.vehicle_type === 'moto' ? '🏍️' : '🚗'
        const vName = `${car.brand} ${car.model}`

        // Maintenance alerts
        maint.forEach(m => {
          const status = getMaintStatus(m, car.current_km)
          if (status === 'overdue' || status === 'warn') {
            const mt = MAINT_TYPES.find(t => t.id === m.type_id)
            const kmLeft = m.next_km - car.current_km
            const daysLeft = m.next_date ? Math.floor((new Date(m.next_date) - new Date()) / 86400000) : null

            allAlerts.push({
              id: `maint-${m.id}`,
              type: status === 'overdue' ? 'danger' : 'warning',
              icon: mt?.emoji || '🔧',
              title: mt?.name || m.type_id,
              vehicle: `${vEmoji} ${vName}`,
              detail: status === 'overdue'
                ? `Vencido${kmLeft < 0 ? ` · ${Math.abs(kmLeft).toLocaleString()} km pasados` : ''}${daysLeft != null && daysLeft < 0 ? ` · hace ${Math.abs(daysLeft)} días` : ''}`
                : `Próximo${kmLeft > 0 ? ` · en ${kmLeft.toLocaleString()} km` : ''}${daysLeft != null && daysLeft > 0 ? ` · en ${daysLeft} días` : ''}`,
              priority: status === 'overdue' ? 0 : 1,
            })
          }
        })

        // ITV alerts
        const latestItv = itv[0]
        if (latestItv) {
          if (latestItv.result === 'negativa') {
            allAlerts.push({
              id: `itv-neg-${car.id}`, type: 'danger', icon: '🛡️',
              title: 'ITV Negativa', vehicle: `${vEmoji} ${vName}`,
              detail: `No apta — ${latestItv.defects || 'revisar defectos'}`,
              priority: 0,
            })
          } else if (latestItv.result === 'desfavorable' && !latestItv.resolved) {
            allAlerts.push({
              id: `itv-desf-${car.id}`, type: 'warning', icon: '🛡️',
              title: 'ITV Desfavorable', vehicle: `${vEmoji} ${vName}`,
              detail: `Pendiente reparar — ${latestItv.defects || 'revisar defectos'}`,
              priority: 0,
            })
          } else if (latestItv.expiry_date) {
            const dLeft = Math.floor((new Date(latestItv.expiry_date) - new Date()) / 86400000)
            if (dLeft < 0) {
              allAlerts.push({
                id: `itv-exp-${car.id}`, type: 'danger', icon: '🛡️',
                title: 'ITV Caducada', vehicle: `${vEmoji} ${vName}`,
                detail: `Caducada hace ${Math.abs(dLeft)} días`,
                priority: 0,
              })
            } else if (dLeft <= 60) {
              allAlerts.push({
                id: `itv-soon-${car.id}`, type: dLeft <= 30 ? 'warning' : 'info', icon: '🛡️',
                title: 'ITV próxima', vehicle: `${vEmoji} ${vName}`,
                detail: `Caduca en ${dLeft} días (${formatDate(latestItv.expiry_date)})`,
                priority: dLeft <= 30 ? 0 : 1,
              })
            }
          }
        }
      }

      // Add reminders
      const reminders = await getReminders(userId)
      reminders.filter(r => !r.completed).forEach(r => {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const due = new Date(r.due_date); due.setHours(0, 0, 0, 0)
        const days = Math.floor((due - today) / 86400000)
        const carInfo = r.cars ? `${r.cars.vehicle_type === 'moto' ? '🏍️' : '🚗'} ${r.cars.brand} ${r.cars.model}` : '📌 General'
        if (days < 0) {
          allAlerts.push({
            id: `rem-${r.id}`, type: 'danger', icon: '🔔',
            title: r.title, vehicle: carInfo,
            detail: `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`,
            priority: 0,
          })
        } else if (days <= 7) {
          allAlerts.push({
            id: `rem-${r.id}`, type: days <= 1 ? 'warning' : 'info', icon: '🔔',
            title: r.title, vehicle: carInfo,
            detail: days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`,
            priority: days <= 1 ? 1 : 2,
          })
        }
      })

      // Group invitations
      try {
        const invitations = await getMyInvitations(userId)
        invitations.forEach(inv => {
          allAlerts.push({
            id: `inv-${inv.id}`, type: 'info', icon: '👥',
            title: `Invitación a "${inv.groups?.name}"`, vehicle: '✨ Grupo',
            detail: `Te ha invitado ${inv.inviter?.name || 'alguien'} · ve a Grupos`,
            priority: 2,
          })
        })
      } catch {}

      // Sort: danger first, then warning, then info
      allAlerts.sort((a, b) => a.priority - b.priority)
      setAlerts(allAlerts)
      setSnoozedMap(getSnoozed(userId))   // de paso caducan los plazos cumplidos
    } catch (err) {
      console.error('Error loading alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  const visible = alerts.filter(a => !snoozedMap[a.id])
  const hidden = alerts.filter(a => snoozedMap[a.id])

  const dangerCount = visible.filter(a => a.type === 'danger').length
  const totalCount = visible.length

  const badgeColor = dangerCount > 0 ? theme.red : totalCount > 0 ? theme.yellow : theme.green

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button onClick={() => setOpen(!open)} style={{
        background: 'none', border: 'none', color: theme.muted, cursor: 'pointer',
        display: 'flex', alignItems: 'center', position: 'relative', padding: 4,
      }}>
        <Bell size={20} color={totalCount > 0 ? theme.accent : theme.muted} />
        {totalCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -4,
            background: badgeColor, color: '#000',
            borderRadius: 0, minWidth: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, padding: '0 4px',
          }}>
            {totalCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          width: isMobile ? 'calc(100vw - 32px)' : 380,
          maxHeight: '70vh', overflowY: 'auto',
          background: theme.card, border: `1px solid ${theme.border}`,
          borderRadius: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 200,
          ...(isMobile ? { right: -60 } : {}),
        }}>
          <div style={{ ...css.flexBetween, padding: '14px 16px', borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ ...css.h3, fontSize: 13 }}>
              {t('notif.title')} {totalCount > 0 && <span style={{ color: theme.muted, fontWeight: 400 }}>({totalCount})</span>}
            </span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: theme.muted, cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', ...css.lbl }}>{t('common.loading')}</div>
          ) : totalCount === 0 && hidden.length === 0 ? (
            <div style={{ padding: 34, textAlign: 'center' }}>
              <BellOff size={24} color={theme.mutedLight} strokeWidth={1.6} />
              <p style={{ ...css.lbl, marginTop: 11 }}>{t('notif.empty')}</p>
            </div>
          ) : (
            <div>
              {visible.map(a => (
                <div key={a.id} style={{
                  padding: '12px 16px', borderBottom: `1px solid ${theme.border}`,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  background: a.type === 'danger' ? `${theme.red}08` : 'transparent',
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{a.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: theme.white }}>{a.title}</span>
                      <span style={css.badge(
                        a.type === 'danger' ? theme.redSoft : a.type === 'warning' ? theme.yellowSoft : theme.accentSoft,
                        a.type === 'danger' ? theme.red : a.type === 'warning' ? theme.yellow : theme.accent
                      )}>
                        {a.type === 'danger' ? t('notif.urgent') : a.type === 'warning' ? t('notif.attention') : t('notif.info')}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{a.vehicle}</div>
                    <div style={{ fontSize: 12, color: a.type === 'danger' ? theme.red : theme.muted, marginTop: 1 }}>{a.detail}</div>
                  </div>
                  <button
                    onClick={() => hide(a.id)}
                    title={t('notif.dismiss', { n: SNOOZE_DAYS })}
                    style={{
                      background: 'none', border: 'none', color: theme.mutedLight,
                      cursor: 'pointer', display: 'flex', padding: 4, flexShrink: 0,
                    }}
                  ><EyeOff size={14} /></button>
                </div>
              ))}

              {/* Silenciadas: siguen ahí, solo que apartadas */}
              {hidden.length > 0 && (
                <div style={{ borderTop: `1px solid ${theme.rule}` }}>
                  <button onClick={() => setShowHidden(v => !v)} style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px',
                    ...css.lbl, color: theme.muted,
                  }}>
                    <Eye size={13} />
                    <span>{t('notif.hidden', { n: hidden.length })}</span>
                    <span style={{ marginLeft: 'auto', color: theme.accent }}>
                      {showHidden ? t('notif.hideHidden') : t('notif.showHidden')}
                    </span>
                  </button>

                  {showHidden && hidden.map(a => (
                    <div key={a.id} style={{
                      padding: '10px 16px', borderTop: `1px solid ${theme.border}`,
                      display: 'flex', gap: 10, alignItems: 'center', opacity: 0.62,
                    }}>
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{a.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.text }}>{a.title}</div>
                        <div style={{ ...css.lbl, fontSize: 8.5, marginTop: 2 }}>
                          {t('notif.backIn', { n: daysLeft(snoozedMap[a.id]) })}
                        </div>
                      </div>
                      <button onClick={() => unhide(a.id)} title={t('notif.restore')} style={{
                        background: 'none', border: 'none', color: theme.accent,
                        cursor: 'pointer', display: 'flex', padding: 4, flexShrink: 0,
                      }}><Undo2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
