import { useMemo } from 'react'
import AreaChart from './AreaChart.jsx'
import { Euro, TrendingUp, Gauge } from 'lucide-react'
import { theme, css } from '../lib/theme.js'
import { t, useLang, fmtMoney, fmtMonth } from '../lib/i18n.js'
import { Stat } from './ui.jsx'
import { MAINT_TYPES } from '../lib/constants.js'

export default function ExpenseTab({ maintenance, fuelLogs, isMobile, currentKm }) {
  const { monthlyData, categoryData, totalMaint, totalFuel, grandTotal, thisYear } = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()

    // Monthly aggregation (last 12 months)
    const months = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString(undefined, { month: 'short' }).replace('.', '')
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
    if (totalFuel > 0) cats[t('common.fuel')] = totalFuel

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
        <Stat icon={<Euro size={18} color={theme.accent} />} label={t('exp.totalSpent')} value={`${grandTotal.toFixed(0)}€`} />
        <Stat icon={<Euro size={18} color={theme.accent} />} label={t('common.maintenance')} value={`${totalMaint.toFixed(0)}€`} color={theme.accent} />
        <Stat icon={<Euro size={18} color={theme.green} />} label={t('common.fuel')} value={`${totalFuel.toFixed(0)}€`} color={theme.green} />
        <Stat icon={<TrendingUp size={18} color={theme.muted} />} label={t('exp.thisYear')} value={`${thisYear.toFixed(0)}€`} color={theme.muted} />
        <Stat icon={<Gauge size={18} color={theme.red} />} label={t('stats.costPerKm')} value={currentKm > 0 && grandTotal > 0 ? `${(grandTotal / currentKm).toFixed(2)}€` : '-'} color={theme.red} />
      </div>

      {/* Monthly bar chart */}
      <div style={{ ...css.card, padding: isMobile ? 12 : 20, marginBottom: 12 }}>
        <h3 style={{ ...css.h3, marginBottom: 16 }}>{t('exp.monthly')}</h3>
        {grandTotal === 0 ? (
          <p style={{ color: theme.muted, textAlign: 'center', padding: 20, fontSize: 13 }}>{t('exp.empty')}</p>
        ) : (
          <AreaChart
            data={monthlyData.map(m => ({ label: m.name, total: m.maint + m.fuel, lower: m.fuel, upper: m.maint }))}
            height={isMobile ? 180 : 260}
            showAverage
            showLabels
          />
        )}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.muted }}>
            <span style={{ width: 9, height: 9, background: theme.accent, display: 'inline-block' }} /> {t('common.maintenance')}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.muted }}>
            <span style={{ width: 9, height: 9, background: theme.green, display: 'inline-block' }} /> {t('common.fuel')}
          </span>
        </div>
      </div>

      {/* Category breakdown */}
      {categoryData.length > 0 && (
        <div style={{ ...css.card, padding: isMobile ? 12 : 20 }}>
          <h3 style={{ ...css.h3, marginBottom: 16 }}>{t('exp.byCategory')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Las categorías van ordenadas de mayor a menor, así que
                la silueta baja sola y se lee como un reparto. */}
            <AreaChart
              data={categoryData.map(c => ({ label: c.name, total: c.value }))}
              height={isMobile ? 120 : 150}
              showLabels
            />
            <div style={{ flex: 1, width: '100%' }}>
              {categoryData.map((c, i) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
                  {/* La tarta traía un color por categoría; ahora el
                      orden es el que manda, así que va el puesto. */}
                  <span style={{ ...css.num, fontSize: 11, color: theme.mutedLight, width: 16, flexShrink: 0 }}>{i + 1}</span>
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
