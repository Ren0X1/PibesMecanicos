import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Euro, TrendingUp, Gauge } from 'lucide-react'
import { theme, css } from '../lib/theme.js'
import { Stat } from './ui.jsx'
import { MAINT_TYPES } from '../lib/constants.js'

const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 0, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: theme.white }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8 }}>
          <span>{p.name}:</span><span style={{ fontWeight: 600 }}>{p.value.toFixed(0)}€</span>
        </div>
      ))}
    </div>
  )
}

export default function ExpenseTab({ maintenance, fuelLogs, isMobile, currentKm }) {
  const { monthlyData, categoryData, totalMaint, totalFuel, grandTotal, thisYear } = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()

    // Monthly aggregation (last 12 months)
    const months = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')
      months[key] = { name: label, maint: 0, fuel: 0 }
    }

    let totalMaint = 0, totalFuel = 0, thisYearTotal = 0

    maintenance.forEach(m => {
      const cost = +(m.cost || 0)
      totalMaint += cost
      if (m.last_date) {
        const key = m.last_date.substring(0, 7)
        if (months[key]) months[key].maint += cost
        if (m.last_date.startsWith(String(year))) thisYearTotal += cost
      }
    })

    fuelLogs.forEach(f => {
      const cost = +(f.total_cost || 0)
      totalFuel += cost
      if (f.date) {
        const key = f.date.substring(0, 7)
        if (months[key]) months[key].fuel += cost
        if (f.date.startsWith(String(year))) thisYearTotal += cost
      }
    })

    // Category breakdown for pie chart
    const cats = {}
    maintenance.forEach(m => {
      const mt = MAINT_TYPES.find(t => t.id === m.type_id)
      const name = mt?.name || m.type_id
      cats[name] = (cats[name] || 0) + +(m.cost || 0)
    })
    if (totalFuel > 0) cats['Combustible'] = totalFuel

    const categoryData = Object.entries(cats)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value: +value.toFixed(0) }))
      .sort((a, b) => b.value - a.value)

    return {
      monthlyData: Object.values(months),
      categoryData,
      totalMaint, totalFuel,
      grandTotal: totalMaint + totalFuel,
      thisYear: thisYearTotal,
    }
  }, [maintenance, fuelLogs])

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 20 }}>
        <Stat icon={<Euro size={18} color={theme.accent} />} label="Total gastado" value={`${grandTotal.toFixed(0)}€`} />
        <Stat icon={<Euro size={18} color="#3b82f6" />} label="Mantenimiento" value={`${totalMaint.toFixed(0)}€`} color="#3b82f6" />
        <Stat icon={<Euro size={18} color={theme.green} />} label="Combustible" value={`${totalFuel.toFixed(0)}€`} color={theme.green} />
        <Stat icon={<TrendingUp size={18} color="#8b5cf6" />} label="Este año" value={`${thisYear.toFixed(0)}€`} color="#8b5cf6" />
        <Stat icon={<Gauge size={18} color="#ec4899" />} label="Coste/km" value={currentKm > 0 && grandTotal > 0 ? `${(grandTotal / currentKm).toFixed(2)}€` : '-'} color="#ec4899" />
      </div>

      {/* Monthly bar chart */}
      <div style={{ ...css.card, padding: isMobile ? 12 : 20, marginBottom: 12 }}>
        <h3 style={{ ...css.h3, marginBottom: 16 }}>Gastos mensuales (12 meses)</h3>
        {grandTotal === 0 ? (
          <p style={{ color: theme.muted, textAlign: 'center', padding: 20, fontSize: 13 }}>Sin gastos registrados aún</p>
        ) : (
          <div style={{ width: '100%', height: isMobile ? 200 : 280 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fill: theme.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: theme.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="maint" name="Mantenimiento" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="fuel" name="Combustible" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.muted }}>
            <span style={{ width: 10, height: 10, borderRadius: 0, background: '#3b82f6', display: 'inline-block' }} /> Mantenimiento
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.muted }}>
            <span style={{ width: 10, height: 10, borderRadius: 0, background: '#22c55e', display: 'inline-block' }} /> Combustible
          </span>
        </div>
      </div>

      {/* Category breakdown */}
      {categoryData.length > 0 && (
        <div style={{ ...css.card, padding: isMobile ? 12 : 20 }}>
          <h3 style={{ ...css.h3, marginBottom: 16 }}>Desglose por categoría</h3>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, alignItems: 'center' }}>
            <div style={{ width: isMobile ? 180 : 200, height: isMobile ? 180 : 200, flexShrink: 0 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={isMobile ? 75 : 85} innerRadius={isMobile ? 40 : 50} dataKey="value" stroke="none">
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, width: '100%' }}>
              {categoryData.map((c, i) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 0, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, color: theme.text }}>{c.name}</span>
                  <span style={{ fontWeight: 700, color: theme.white }}>{c.value}€</span>
                  <span style={{ color: theme.muted, fontSize: 11, width: 40, textAlign: 'right' }}>
                    {grandTotal > 0 ? ((c.value / grandTotal) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
