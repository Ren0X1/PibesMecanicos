import { useMemo } from 'react'
import { theme, css } from '../lib/theme.js'
import { t, useLang, fmtMoney, fmtMonth } from '../lib/i18n.js'
import AreaChart, { toAreaData } from './AreaChart.jsx'

/* ─────────────────────────────────────────────────────────────
   Gasto mensual · cifra y tendencia

   Un gráfico de barras en una columna de 290 px no se puede leer:
   no caben ni los meses ni los valores. Así que se responde a la
   pregunta que uno se hace de verdad —¿este mes voy bien o mal?—
   con la cifra en grande, la variación contra el mes anterior y
   una línea de doce meses con la media punteada detrás.

   La línea no lleva ejes a propósito: no está para leer valores,
   está para ver la forma. El valor exacto es el número de arriba.
   ───────────────────────────────────────────────────────────── */

/* Reparte mantenimientos y repostajes en los últimos 12 meses. */
export function monthlySpend(maintenance = [], fuelLogs = []) {
  const now = new Date()
  const buckets = []
  const index = {}

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const b = { key, date: d, maint: 0, fuel: 0, total: 0 }
    index[key] = b
    buckets.push(b)
  }

  for (const m of maintenance) {
    if (!m.last_date) continue
    const b = index[String(m.last_date).slice(0, 7)]
    if (b) b.maint += Number(m.cost || 0)
  }
  for (const f of fuelLogs) {
    if (!f.date) continue
    const b = index[String(f.date).slice(0, 7)]
    if (b) b.fuel += Number(f.total_cost || 0)
  }
  for (const b of buckets) b.total = b.maint + b.fuel

  return buckets
}

export default function SpendChart({ maintenance, fuelLogs, height = 60 }) {
  useLang()

  const data = useMemo(() => {
    const months = monthlySpend(maintenance, fuelLogs)
    const totals = months.map(m => m.total)
    const max = Math.max(...totals, 1)
    const sum = totals.reduce((a, b) => a + b, 0)
    const avg = sum / totals.length
    const cur = totals[totals.length - 1]
    const prev = totals[totals.length - 2]
    // Sin mes anterior no hay variación que enseñar: mejor callar
    // que inventar un «+100 %» que no significa nada.
    const delta = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null
    return { months, totals, max, sum, avg, cur, prev, delta }
  }, [maintenance, fuelLogs])

  const { months, totals, max, sum, avg, cur, prev, delta } = data

  if (sum === 0) {
    return (
      <div style={{ padding: '18px 14px' }}>
        <p style={{ ...css.lbl, textTransform: 'none', letterSpacing: '0.03em', fontSize: 11 }}>
          {t('chart.noSpend')}
        </p>
      </div>
    )
  }

  const up = delta != null && delta > 0
  const deltaColor = delta == null ? theme.mutedLight : up ? theme.red : theme.green

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '13px 14px 0' }}>
        <div style={{ ...css.lbl, fontSize: 8.5 }}>{t('chart.thisMonth')}</div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ ...css.num, fontSize: 27, fontWeight: 600, color: theme.white, lineHeight: 1 }}>
            {fmtMoney(cur)}
          </span>
          {delta != null && delta !== 0 && (
            <span style={{ ...css.num, fontSize: 11, color: deltaColor, whiteSpace: 'nowrap' }}>
              {up ? '▲' : '▼'} {Math.abs(delta)} %
            </span>
          )}
        </div>

        <div style={{ ...css.lbl, fontSize: 8.5, marginTop: 6, textTransform: 'none', letterSpacing: '0.04em' }}>
          {delta != null
            ? t('chart.vsPrev', { prev: fmtMoney(prev), avg: fmtMoney(avg) })
            : `${t('chart.average')} ${fmtMoney(avg)}`}
        </div>
      </div>

      {/* La forma del año: la silueta de abajo es el combustible y
          la franja de encima, el taller. */}
      <div style={{ marginTop: 8 }}>
        <AreaChart
          data={toAreaData(months)}
          height={height}
          showAverage
        />
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '8px 14px 12px', ...css.lbl, fontSize: 8,
      }}>
        <span>{fmtMonth(months[0].date)}</span>
        <span style={{ color: theme.white }}>{fmtMonth(months[months.length - 1].date)}</span>
      </div>
    </div>
  )
}
