import { useState, useEffect, useMemo } from 'react'
import { Car, Euro, Fuel, Wrench, Gauge, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { theme, css } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { getCars, getMaintenanceRecords, getFuelLogs, getItvRecords } from '../lib/api.js'
import { getMaintStatus, MAINT_TYPES } from '../lib/constants.js'
import { Stat, Loader } from './ui.jsx'

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 0, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: theme.text }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8 }}>
          <span>{p.name}:</span><span style={{ fontWeight: 600 }}>{typeof p.value === 'number' ? p.value.toFixed(0) + (p.dataKey === 'km' ? ' km' : '€') : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function UserStats({ user, onToast }) {
  const mob = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [cars, setCars] = useState([])
  const [carData, setCarData] = useState({})

  useEffect(() => { load() }, [user.id])

  const load = async () => {
    try {
      const list = await getCars(user.id)
      setCars(list)
      const data = {}
      for (const car of list) {
        const [maint, fuel, itv] = await Promise.all([
          getMaintenanceRecords(car.id), getFuelLogs(car.id), getItvRecords(car.id)
        ])
        data[car.id] = { maint, fuel, itv }
      }
      setCarData(data)
    } catch (err) { onToast('Error: ' + err.message, 'error') }
    finally { setLoading(false) }
  }

  const stats = useMemo(() => {
    if (cars.length === 0) return null

    let totalKm = 0, totalMaint = 0, totalFuel = 0, totalLiters = 0
    let overdueMaint = 0, warnMaint = 0
    let itvIssues = 0

    // Per-vehicle breakdown
    const perVehicle = cars.map(car => {
      const d = carData[car.id] || { maint: [], fuel: [], itv: [] }
      const mCost = d.maint.reduce((s, m) => s + +(m.cost || 0), 0)
      const fCost = d.fuel.reduce((s, f) => s + +(f.total_cost || 0), 0)
      const liters = d.fuel.reduce((s, f) => s + +(f.liters || 0), 0)

      let ovr = 0, wrn = 0
      d.maint.forEach(m => { const st = getMaintStatus(m, car.current_km); if (st === 'overdue') ovr++; if (st === 'warn') wrn++ })

      const latestItv = d.itv[0]
      let itvStatus = 'none'
      if (latestItv) {
        if (latestItv.result === 'negativa') itvStatus = 'failed'
        else if (latestItv.expiry_date) {
          const d = Math.floor((new Date(latestItv.expiry_date) - new Date()) / 86400000)
          if (d < 0) itvStatus = 'expired'
          else if (d <= 30) itvStatus = 'soon'
          else itvStatus = 'valid'
        }
      }
      if (['failed', 'expired', 'soon'].includes(itvStatus)) itvIssues++

      totalKm += car.current_km || 0
      totalMaint += mCost
      totalFuel += fCost
      totalLiters += liters
      overdueMaint += ovr
      warnMaint += wrn

      return {
        id: car.id,
        name: `${car.vehicle_type === 'moto' ? '🏍️' : '🚗'} ${car.brand} ${car.model}`,
        plate: car.plate,
        km: car.current_km || 0,
        maint: mCost,
        fuel: fCost,
        total: mCost + fCost,
        overdue: ovr,
        warn: wrn,
        itvStatus,
      }
    })

    // Monthly aggregation (last 12 months)
    const now = new Date()
    const months = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months[key] = { name: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''), maint: 0, fuel: 0 }
    }

    cars.forEach(car => {
      const d = carData[car.id] || { maint: [], fuel: [] }
      d.maint.forEach(m => {
        if (m.last_date) {
          const k = m.last_date.substring(0, 7)
          if (months[k]) months[k].maint += +(m.cost || 0)
        }
      })
      d.fuel.forEach(f => {
        if (f.date) {
          const k = f.date.substring(0, 7)
          if (months[k]) months[k].fuel += +(f.total_cost || 0)
        }
      })
    })

    // Pie data: spending per vehicle
    const spendPie = perVehicle
      .filter(v => v.total > 0)
      .map(v => ({ name: v.plate, value: +v.total.toFixed(0) }))

    return {
      totalKm, totalMaint, totalFuel, totalLiters,
      grandTotal: totalMaint + totalFuel,
      overdueMaint, warnMaint, itvIssues,
      perVehicle, monthlyData: Object.values(months), spendPie,
    }
  }, [cars, carData])

  if (loading) return <Loader text="Cargando estadísticas..." />

  return (
    <div style={css.container}>
      <div style={{ paddingTop: mob ? 20 : 28, paddingBottom: 40 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ ...css.h1, fontSize: mob ? 22 : 26 }}>Resumen</h1>
          <p style={css.subtitle}>Estadísticas globales de tus {cars.length} vehículo{cars.length !== 1 ? 's' : ''}</p>
        </div>

        {!stats || cars.length === 0 ? (
          <div style={{ ...css.card, padding: 40, textAlign: 'center' }}>
            <Car size={40} color={theme.mutedLight} style={{ marginBottom: 12 }} />
            <p style={{ color: theme.muted, fontSize: 13 }}>No tienes vehículos registrados aún</p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(4, 1fr)', gap: mob ? 8 : 12, marginBottom: 16 }}>
              <Stat icon={<Euro size={18} color={theme.accent} />} label="Gasto total" value={`${stats.grandTotal.toFixed(0)}€`} />
              <Stat icon={<Wrench size={18} color="#3b82f6" />} label="Mantenimiento" value={`${stats.totalMaint.toFixed(0)}€`} color="#3b82f6" />
              <Stat icon={<Fuel size={18} color={theme.green} />} label="Combustible" value={`${stats.totalFuel.toFixed(0)}€`} color={theme.green} />
              <Stat icon={<Gauge size={18} color="#8b5cf6" />} label="Km totales" value={stats.totalKm.toLocaleString()} color="#8b5cf6" />
            </div>

            {/* Alerts row */}
            {(stats.overdueMaint > 0 || stats.warnMaint > 0 || stats.itvIssues > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(3, 1fr)', gap: mob ? 8 : 12, marginBottom: 20 }}>
                {stats.overdueMaint > 0 && (
                  <div style={{ ...css.card, padding: 14, background: `${theme.red}08`, border: `1px solid ${theme.red}30`, marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertTriangle size={20} color={theme.red} />
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: theme.red }}>{stats.overdueMaint}</div>
                        <div style={{ fontSize: 11, color: theme.muted }}>Mantenimientos vencidos</div>
                      </div>
                    </div>
                  </div>
                )}
                {stats.warnMaint > 0 && (
                  <div style={{ ...css.card, padding: 14, background: `${theme.yellow}08`, border: `1px solid ${theme.yellow}30`, marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertTriangle size={20} color={theme.yellow} />
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: theme.yellow }}>{stats.warnMaint}</div>
                        <div style={{ fontSize: 11, color: theme.muted }}>Mantenimientos próximos</div>
                      </div>
                    </div>
                  </div>
                )}
                {stats.itvIssues > 0 && (
                  <div style={{ ...css.card, padding: 14, background: `${theme.red}08`, border: `1px solid ${theme.red}30`, marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ShieldCheck size={20} color={theme.red} />
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: theme.red }}>{stats.itvIssues}</div>
                        <div style={{ fontSize: 11, color: theme.muted }}>ITV con problemas</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Per-vehicle table */}
            <div style={{ ...css.card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>
                <h3 style={css.h3}>Gasto por vehículo</h3>
              </div>
              {mob ? (
                <div>
                  {stats.perVehicle.map(v => (
                    <div key={v.id} style={{ padding: '12px 14px', borderBottom: `1px solid ${theme.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{v.name}</span>
                        <span style={{ fontWeight: 700, color: theme.accent, fontSize: 14 }}>{v.total.toFixed(0)}€</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: theme.muted, flexWrap: 'wrap' }}>
                        <span>{v.plate}</span>
                        <span>{v.km.toLocaleString()} km</span>
                        <span style={{ color: '#3b82f6' }}>Mant. {v.maint.toFixed(0)}€</span>
                        <span style={{ color: theme.green }}>Comb. {v.fuel.toFixed(0)}€</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                        {['Vehículo', 'Matrícula', 'Km', 'Mantenimiento', 'Combustible', 'Total', 'Coste/km'].map((h, i) =>
                          <th key={i} style={{ ...css.th, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.perVehicle.map(v => (
                        <tr key={v.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ ...css.td, fontWeight: 600 }}>{v.name}</td>
                          <td style={{ ...css.td, color: theme.muted }}>{v.plate}</td>
                          <td style={{ ...css.td, textAlign: 'right' }}>{v.km.toLocaleString()}</td>
                          <td style={{ ...css.td, textAlign: 'right', color: '#3b82f6' }}>{v.maint.toFixed(0)}€</td>
                          <td style={{ ...css.td, textAlign: 'right', color: theme.green }}>{v.fuel.toFixed(0)}€</td>
                          <td style={{ ...css.td, textAlign: 'right', fontWeight: 700, color: theme.accent }}>{v.total.toFixed(0)}€</td>
                          <td style={{ ...css.td, textAlign: 'right', color: theme.muted }}>
                            {v.km > 0 ? `${(v.total / v.km).toFixed(2)}€` : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: theme.bg }}>
                        <td style={{ ...css.td, fontWeight: 800 }} colSpan={2}>TOTAL</td>
                        <td style={{ ...css.td, textAlign: 'right', fontWeight: 700 }}>{stats.totalKm.toLocaleString()}</td>
                        <td style={{ ...css.td, textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{stats.totalMaint.toFixed(0)}€</td>
                        <td style={{ ...css.td, textAlign: 'right', fontWeight: 700, color: theme.green }}>{stats.totalFuel.toFixed(0)}€</td>
                        <td style={{ ...css.td, textAlign: 'right', fontWeight: 800, color: theme.accent }}>{stats.grandTotal.toFixed(0)}€</td>
                        <td style={{ ...css.td, textAlign: 'right', fontWeight: 700, color: theme.muted }}>
                          {stats.totalKm > 0 ? `${(stats.grandTotal / stats.totalKm).toFixed(2)}€` : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Monthly chart */}
            {stats.grandTotal > 0 && (
              <div style={{ ...css.card, padding: mob ? 12 : 20, marginBottom: 12 }}>
                <h3 style={{ ...css.h3, marginBottom: 16 }}>Gastos mensuales (todos los vehículos)</h3>
                <div style={{ width: '100%', height: mob ? 220 : 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={stats.monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fill: theme.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: theme.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="maint" name="Mantenimiento" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="fuel" name="Combustible" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.muted }}>
                    <span style={{ width: 10, height: 10, borderRadius: 0, background: '#3b82f6', display: 'inline-block' }} /> Mantenimiento
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.muted }}>
                    <span style={{ width: 10, height: 10, borderRadius: 0, background: '#22c55e', display: 'inline-block' }} /> Combustible
                  </span>
                </div>
              </div>
            )}

            {/* Spending distribution pie */}
            {stats.spendPie.length > 1 && (
              <div style={{ ...css.card, padding: mob ? 12 : 20 }}>
                <h3 style={{ ...css.h3, marginBottom: 16 }}>Distribución del gasto por vehículo</h3>
                <div style={{ display: 'flex', flexDirection: mob ? 'column' : 'row', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: mob ? 180 : 200, height: mob ? 180 : 200, flexShrink: 0 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={stats.spendPie} cx="50%" cy="50%" outerRadius={mob ? 75 : 85} innerRadius={mob ? 40 : 50} dataKey="value" stroke="none">
                          {stats.spendPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1, width: '100%' }}>
                    {stats.spendPie.map((v, i) => (
                      <div key={v.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 0, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ flex: 1, color: theme.text }}>{v.name}</span>
                        <span style={{ fontWeight: 700, color: theme.text }}>{v.value}€</span>
                        <span style={{ color: theme.muted, fontSize: 11, width: 40, textAlign: 'right' }}>
                          {stats.grandTotal > 0 ? ((v.value / stats.grandTotal) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
