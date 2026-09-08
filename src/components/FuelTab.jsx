import { formatDate } from '../lib/constants.js'
import { useState, useMemo } from 'react'
import { Fuel, Plus, Trash2, Save, TrendingDown, Gauge, Route } from 'lucide-react'
import { theme, css } from '../lib/theme.js'
import { t, useLang, fmtNum, fmtMoney } from '../lib/i18n.js'
import { createFuelLog, deleteFuelLog } from '../lib/api.js'
import { Modal, Field, Stat, ResponsiveGrid2, DateInput, NumInput } from './ui.jsx'

const today = new Date().toISOString().split('T')[0]
/* Getters, no valores: si se resolviera aquí, el texto se quedaría
   fijado en el idioma que hubiera al cargar el módulo. */
const MODES = [
  { value: 'ciudad', get label() { return t('drive.ciudad') }, get short() { return t('drive.ciudad') } },
  { value: 'mixto', get label() { return t('drive.mixto') }, get short() { return t('drive.mixto') } },
  { value: 'carretera', get label() { return t('drive.carretera') }, get short() { return t('drive.carretera') } },
]

function FuelFormModal({ open, onClose, onSave, carKm }) {
  const [form, setForm] = useState({
    km: carKm || 0, date: today, liters: 0, price_liter: 0,
    full_tank: true, driving_mode: 'ciudad', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const total = (form.liters * form.price_liter).toFixed(2)

  const handleSave = async () => {
    if (!form.liters || !form.km) return
    setSaving(true)
    try { await onSave({ ...form, total_cost: +total }) } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('fuelt.newTitle')}>
      <ResponsiveGrid2>
        <Field label={t('fuelt.carKm')}>
          <NumInput value={form.km} onChange={e => set('km', e.target.value)} />
        </Field>
        <Field label={t('common.date')}>
          <DateInput value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label={t('fuelt.litres')}>
          <NumInput step="0.01" decimal value={form.liters} onChange={e => set('liters', e.target.value)} />
        </Field>
        <Field label={t('fuelt.priceEur')}>
          <NumInput step="0.001" decimal value={form.price_liter} onChange={e => set('price_liter', e.target.value)} />
        </Field>
      </ResponsiveGrid2>

      <div style={{ ...css.card, padding: 12, marginBottom: 14, background: theme.bg }}>
        <span style={{ fontSize: 12, color: theme.muted }}>{t('common.total')}: </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: theme.accent }}>{total} €</span>
      </div>

      <Field label={t('fuelt.driveType')}>
        <div style={{ display: 'flex', gap: 6 }}>
          {MODES.map(m => (
            <button key={m.value} onClick={() => set('driving_mode', m.value)} type="button" style={{
              ...css.btn(form.driving_mode === m.value ? theme.accent : theme.bg, form.driving_mode === m.value ? '#000' : theme.muted),
              flex: 1, justifyContent: 'center', border: `1px solid ${form.driving_mode === m.value ? theme.accent : theme.border}`,
              fontSize: 12, padding: '8px 6px',
            }}>{m.label}</button>
          ))}
        </div>
      </Field>

      <Field label={t('fuelt.fullTankQ')}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[true, false].map(v => (
            <button key={String(v)} onClick={() => set('full_tank', v)} type="button" style={{
              ...css.btn(form.full_tank === v ? theme.accent : theme.bg, form.full_tank === v ? '#000' : theme.muted),
              flex: 1, justifyContent: 'center', border: `1px solid ${theme.border}`,
            }}>{v ? t('fuelt.yesFull') : t('fuelt.noPartial')}</button>
          ))}
        </div>
      </Field>

      <Field label={t('common.notes')}>
        <input style={css.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Gasolinera, tipo..." />
      </Field>

      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
        <button onClick={onClose} style={css.btnOutline}>{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving} style={css.btn()}>
          <Save size={14} /> {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </Modal>
  )
}

// Calculate per-tank consumption for each log
function calcConsumptions(logs) {
  if (logs.length < 2) return { perTank: {}, avg: null }

  const sorted = [...logs].sort((a, b) => a.km - b.km)
  const perTank = {}

  for (let i = 1; i < sorted.length; i++) {
    const kmDiff = sorted[i].km - sorted[i - 1].km
    if (kmDiff > 0) {
      perTank[sorted[i].id] = +((sorted[i].liters / kmDiff) * 100).toFixed(1)
    }
  }

  const values = Object.values(perTank)
  const avg = values.length > 0 ? +(values.reduce((s, v) => s + v, 0) / values.length).toFixed(1) : null

  return { perTank, avg }
}

function ConsumptionBadge({ value }) {
  if (value == null) return <span style={{ color: theme.mutedLight, fontSize: 11 }}>—</span>
  const color = value <= 6 ? theme.green : value <= 8 ? theme.accent : value <= 10 ? theme.yellow : theme.red
  return <span style={css.badge(`${color}20`, color)}>{value} L/100</span>
}

function ModeBadge({ mode }) {
  const m = MODES.find(x => x.value === mode)
  if (!m) return null
  return <span style={{ fontSize: 11, color: theme.muted }}>{m.label}</span>
}

export default function FuelTab({ carId, carKm, fuelLogs, onReload, onToast, onKmUpdate, isMobile }) {
  const [showAdd, setShowAdd] = useState(false)

  const { perTank, avg } = useMemo(() => calcConsumptions(fuelLogs), [fuelLogs])

  const handleAdd = async (form) => {
    try {
      await createFuelLog({
        car_id: carId, km: form.km, date: form.date,
        liters: form.liters, price_liter: form.price_liter,
        total_cost: form.total_cost, full_tank: form.full_tank,
        driving_mode: form.driving_mode, notes: form.notes,
      })
      // Update car km
      if (onKmUpdate) await onKmUpdate(form.km)
      setShowAdd(false)
      onToast(t('fuelt.added'))
      onReload()
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  const handleDelete = async (id) => {
    try {
      await deleteFuelLog(id)
      onToast(t('fuelt.deleted'))
      onReload()
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  const totalSpent = fuelLogs.reduce((s, l) => s + (l.total_cost || 0), 0)
  const totalLiters = fuelLogs.reduce((s, l) => s + (l.liters || 0), 0)
  const avgPrice = fuelLogs.length > 0
    ? (fuelLogs.reduce((s, l) => s + (l.price_liter || 0), 0) / fuelLogs.length).toFixed(2)
    : null

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 16 }}>
        {avg != null && (
          <Stat icon={<TrendingDown size={15} />} label={t('fuelt.avgConsum')} value={`${avg} L/100`} color={theme.accent} />
        )}
        <Stat icon={<Fuel size={18} color={theme.accent} />} label={t('fuelt.totalSpent')} value={`${totalSpent.toFixed(0)}€`} />
        <Stat icon={<Gauge size={18} color={theme.green} />} label={t('fuelt.totalLitres')} value={`${totalLiters.toFixed(0)}L`} color={theme.green} />
        {avgPrice && (
          <Stat icon={<Fuel size={18} color={theme.muted} />} label={t('fuelt.avgPrice')} value={`${avgPrice}€`} color={theme.muted} />
        )}
      </div>

      <div style={{ ...css.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ ...css.flexBetween, padding: isMobile ? '12px 14px' : '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
          <h3 style={css.h3}><Fuel size={16} style={{ marginRight: 6 }} />{t('fuelt.title')}</h3>
          <button onClick={() => setShowAdd(true)} style={css.btnSm(theme.accent, '#000')}>
            <Plus size={12} /> {t('common.add')}
          </button>
        </div>

        {fuelLogs.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Fuel size={32} color={theme.mutedLight} style={{ marginBottom: 8 }} />
            <p style={{ color: theme.muted, fontSize: 13 }}>{t('fuelt.empty')}</p>
            <button onClick={() => setShowAdd(true)} style={{ ...css.btn(), marginTop: 12 }}>
              <Plus size={14} /> {t('fuelt.logIt')}
            </button>
          </div>
        ) : isMobile ? (
          /* ── Mobile: cards ── */
          <div style={{ padding: 10 }}>
            {fuelLogs.map(l => (
              <div key={l.id} style={{
                padding: '12px 8px', borderBottom: `1px solid ${theme.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700 }}>{l.liters}L</span>
                    <span style={{ color: theme.accent, fontWeight: 600 }}>{l.total_cost?.toFixed(2)}€</span>
                    <ConsumptionBadge value={perTank[l.id]} />
                  </div>
                  <div style={{ fontSize: 11, color: theme.muted, marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>{formatDate(l.date)}</span>
                    <span>·</span>
                    <span>{l.km?.toLocaleString()} km</span>
                    <span>·</span>
                    <span>{l.price_liter}€/L</span>
                    {l.driving_mode && <ModeBadge mode={l.driving_mode} />}
                    {l.full_tank && <span>⛽</span>}
                    {l.notes && <span>· {l.notes}</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(l.id)} style={css.btnSm(theme.redSoft, theme.red)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* ── Desktop: table ── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                  {[t('common.date'), t('common.km'), t('fuelt.litres'), t('fuelt.perLitre'), t('common.total'), t('fuelt.consum'), t('fuelt.modeCol'), '', ''].map((h, i) => (
                    <th key={i} style={css.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fuelLogs.map(l => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <td style={css.td}>{formatDate(l.date)}</td>
                    <td style={{ ...css.td, color: theme.muted }}>{l.km?.toLocaleString()}</td>
                    <td style={{ ...css.td, fontWeight: 600 }}>{l.liters} L</td>
                    <td style={{ ...css.td, color: theme.muted }}>{l.price_liter}€</td>
                    <td style={{ ...css.td, fontWeight: 700, color: theme.accent }}>{l.total_cost?.toFixed(2)}€</td>
                    <td style={css.td}><ConsumptionBadge value={perTank[l.id]} /></td>
                    <td style={css.td}><ModeBadge mode={l.driving_mode} /></td>
                    <td style={css.td}>{l.full_tank ? '⛽' : ''}</td>
                    <td style={css.td}>
                      <button onClick={() => handleDelete(l.id)} style={css.btnSm(theme.redSoft, theme.red)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FuelFormModal open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAdd} carKm={carKm} />
    </>
  )
}
