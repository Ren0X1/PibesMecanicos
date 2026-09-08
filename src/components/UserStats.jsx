import { useState, useEffect, useMemo } from 'react'
import { Car, Euro, Fuel, Wrench, Gauge, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react'
import AreaChart from './AreaChart.jsx'
import TwoColumn, { useTwoCol, Panel, Figure, Row, AttentionList } from './TwoColumn.jsx'
import { theme, css } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { getCars, getMaintenanceRecords, getFuelLogs, getItvRecords } from '../lib/api.js'
import { getMaintStatus, MAINT_TYPES } from '../lib/constants.js'
import { Stat, Loader } from './ui.jsx'
import { t, useLang, fmtNum, fmtMoney, fmtMonth } from '../lib/i18n.js'


/* Mantenimiento y combustible son las dos series de todas las
   gráficas. Se les da color fijo dentro del tema para que
   signifiquen lo mismo en toda la aplicación. */
const SERIES = { maint: () => theme.accent, fuel: () => theme.green }

export default function UserStats({ user, onToast }) {
  useLang()
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
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
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
      months[key] = { name: fmtMonth(d).replace('.', ''), maint: 0, fuel: 0 }
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

  /* A partir del iPad mini de lado, lo que hay que mirar hoy se va
     a una columna fija: qué requiere atención y el coste por km. */
  const { two } = useTwoCol()

  if (loading) return <Loader text={t('common.loading')} />

  /* Un vehículo entra en la columna si tiene algo vencido, algo
     próximo o la ITV en cualquier estado que no sea «vale». */
  const attention = (stats?.perVehicle || [])
    .filter(v => v.overdue > 0 || v.warn > 0 || ['failed', 'expired', 'soon'].includes(v.itvStatus))
    .map(v => {
      const partes = []
      if (v.overdue > 0) partes.push(`${v.overdue} ${t('stats.overdue')}`)
      if (v.warn > 0) partes.push(`${v.warn} ${t('stats.upcoming')}`)
      if (['failed', 'expired'].includes(v.itvStatus)) partes.push(t('stats.itvIssues'))
      else if (v.itvStatus === 'soon') partes.push(t('itv.soon'))
      return {
        key: v.id,
        title: v.name,
        sub: partes.join(' · '),
        color: v.overdue > 0 || ['failed', 'expired'].includes(v.itvStatus) ? theme.red : theme.yellow,
      }
    })

  return (
    <div style={css.container}>
      <div style={{ paddingTop: mob ? 20 : 28, paddingBottom: 40 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ ...css.h1, fontSize: mob ? 22 : 26 }}>{t('stats.title')}</h1>
          <p style={css.subtitle}>{t('stats.sub', { n: cars.length })}</p>
        </div>

        {!stats || cars.length === 0 ? (
          <div style={{ ...css.card, padding: 40, textAlign: 'center' }}>
            <Car size={40} color={theme.mutedLight} style={{ marginBottom: 12 }} />
            <p style={css.lbl}>{t('stats.empty')}</p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(4, 1fr)', gap: mob ? 8 : 12, marginBottom: 16 }}>
              <Stat icon={<Euro size={15} />} label={t('stats.totalSpend')} value={fmtMoney(stats.grandTotal)} />
              <Stat icon={<Wrench size={15} />} label={t('common.maintenance')} value={fmtMoney(stats.totalMaint)} color={theme.accent} />
              <Stat icon={<Fuel size={15} />} label={t('common.fuel')} value={fmtMoney(stats.totalFuel)} color={theme.green} />
              <Stat icon={<Gauge size={15} />} label={t('stats.totalKm')} value={fmtNum(stats.totalKm)} />
            </div>

            {/* Los avisos, en ancho, se van a la columna de la derecha */}
            {!two && (stats.overdueMaint > 0 || stats.warnMaint > 0 || stats.itvIssues > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(3, 1fr)', gap: mob ? 8 : 12, marginBottom: 20 }}>
                {stats.overdueMaint > 0 && (
                  <div style={{ ...css.card, padding: 14, background: `${theme.red}08`, border: `1px solid ${theme.red}30`, marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertTriangle size={20} color={theme.red} />
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: theme.red }}>{stats.overdueMaint}</div>
                        <div style={css.lbl}>{t('stats.overdue')}</div>
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
                        <div style={css.lbl}>{t('stats.upcoming')}</div>
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
                        <div style={css.lbl}>{t('stats.itvIssues')}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contenido a la izquierda; a la derecha, lo que hay
                que mirar hoy. En estrecho la columna no se repite:
                los avisos ya salen arriba y el coste por km está en
                la tabla. */}
            <TwoColumn narrow="hide" context={two ? (
              <>
                <Panel title={t('stats.attention')} right={attention.length || null}>
                  <AttentionList items={attention} empty={t('stats.allGood')} />
                </Panel>

                <Panel title={t('stats.costPerKm')}>
                  <Figure
                    label={t('stats.fleetCost')}
                    value={stats.totalKm > 0 ? fmtMoney(stats.grandTotal / stats.totalKm, 2) : '—'}
                    note={`${fmtMoney(stats.grandTotal)} · ${fmtNum(stats.totalKm)} ${t('common.km')}`}
                  />
                  <div style={{ marginTop: 12 }}>
                    {stats.perVehicle.map(v => (
                      <Row
                        key={v.id}
                        label={v.plate}
                        value={v.km > 0 ? fmtMoney(v.total / v.km, 2) : '—'}
                      />
                    ))}
                  </div>
                </Panel>
              </>
            ) : null}>

            {/* Per-vehicle table */}
            <div style={{ ...css.card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>
                <h3 style={css.h3}>{t('stats.byVehicle')}</h3>
              </div>
              {mob ? (
                <div>
                  {stats.perVehicle.map(v => (
                    <div key={v.id} style={{ padding: '12px 14px', borderBottom: `1px solid ${theme.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{v.name}</span>
                        <span style={{ ...css.num, fontWeight: 700, color: theme.accent, fontSize: 14 }}>{fmtMoney(v.total)}</span>
                      </div>
                      <div style={{ ...css.lbl, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>{v.plate}</span>
                        <span>{fmtNum(v.km)} {t('common.km')}</span>
                        <span style={{ color: theme.accent }}>{t('common.maintenance')} {fmtMoney(v.maint)}</span>
                        <span style={{ color: theme.green }}>{t('common.fuel')} {fmtMoney(v.fuel)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                        {[t('common.vehicle'), t('common.plate'), t('common.km'), t('common.maintenance'), t('common.fuel'), t('common.total'), t('stats.costPerKm')].map((h, i) =>
                          <th key={i} style={{ ...css.th, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.perVehicle.map(v => (
                        <tr key={v.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ ...css.td, fontWeight: 600 }}>{v.name}</td>
                          <td style={{ ...css.td, color: theme.muted }}>{v.plate}</td>
                          <td style={{ ...css.td, ...css.num, textAlign: 'right' }}>{fmtNum(v.km)}</td>
                          <td style={{ ...css.td, ...css.num, textAlign: 'right', color: theme.accent }}>{fmtMoney(v.maint)}</td>
                          <td style={{ ...css.td, ...css.num, textAlign: 'right', color: theme.green }}>{fmtMoney(v.fuel)}</td>
                          <td style={{ ...css.td, ...css.num, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(v.total)}</td>
                          <td style={{ ...css.td, ...css.num, textAlign: 'right', color: theme.muted }}>
                            {v.km > 0 ? fmtMoney(v.total / v.km, 2) : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: theme.bg }}>
                        <td style={{ ...css.td, ...css.lbl, color: theme.white }} colSpan={2}>{t('common.total')}</td>
                        <td style={{ ...css.td, ...css.num, textAlign: 'right', fontWeight: 700 }}>{fmtNum(stats.totalKm)}</td>
                        <td style={{ ...css.td, ...css.num, textAlign: 'right', fontWeight: 700, color: theme.accent }}>{fmtMoney(stats.totalMaint)}</td>
                        <td style={{ ...css.td, ...css.num, textAlign: 'right', fontWeight: 700, color: theme.green }}>{fmtMoney(stats.totalFuel)}</td>
                        <td style={{ ...css.td, ...css.num, textAlign: 'right', fontWeight: 700, color: theme.white }}>{fmtMoney(stats.grandTotal)}</td>
                        <td style={{ ...css.td, ...css.num, textAlign: 'right', fontWeight: 700, color: theme.muted }}>
                          {stats.totalKm > 0 ? fmtMoney(stats.grandTotal / stats.totalKm, 2) : '—'}
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
                <h3 style={{ ...css.h3, marginBottom: 16 }}>{t('stats.monthly')}</h3>
                <AreaChart
                  data={stats.monthlyData.map(m => ({ label: m.name, total: m.maint + m.fuel, lower: m.fuel, upper: m.maint }))}
                  height={mob ? 200 : 260}
                  lowerColor={SERIES.fuel()}
                  upperColor={SERIES.maint()}
                  showAverage
                  showLabels
                />
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
                  <span style={{ ...css.lbl, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 9, height: 9, background: SERIES.maint(), display: 'inline-block' }} /> {t('common.maintenance')}
                  </span>
                  <span style={{ ...css.lbl, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 9, height: 9, background: SERIES.fuel(), display: 'inline-block' }} /> {t('common.fuel')}
                  </span>
                </div>
              </div>
            )}

            {/* Spending distribution pie */}
            {stats.spendPie.length > 1 && (
              <div style={{ ...css.card, padding: mob ? 12 : 20 }}>
                <h3 style={{ ...css.h3, marginBottom: 16 }}>{t('stats.distribution')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Ordenado de mayor a menor: la silueta baja sola y
                      se lee como un reparto entre vehículos. */}
                  <AreaChart
                    data={stats.spendPie.map(v => ({ label: v.name, total: v.value }))}
                    height={mob ? 130 : 160}
                    showLabels
                  />
                  <div style={{ flex: 1, width: '100%' }}>
                    {stats.spendPie.map((v, i) => (
                      <div key={v.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
                        <span style={{ ...css.num, fontSize: 11, color: theme.mutedLight, width: 16, flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ flex: 1, color: theme.text }}>{v.name}</span>
                        <span style={{ ...css.num, fontWeight: 700, color: theme.text }}>{fmtMoney(v.value)}</span>
                        <span style={{ color: theme.muted, fontSize: 11, width: 40, textAlign: 'right' }}>
                          {stats.grandTotal > 0 ? ((v.value / stats.grandTotal) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </TwoColumn>
          </>
        )}
      </div>
    </div>
  )
}
