import { useState, useEffect } from 'react'
import { Car, Plus, Trash2, Save } from 'lucide-react'
import { theme, css, FONT } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { getCars, createCar, deleteCar, getMaintenanceRecords, getCarParts, getItvRecords } from '../lib/api.js'
import { FUEL_TYPES, TRANS_TYPES, VEHICLE_TYPES, MAINT_TYPES, getMaintStatus, fuelLabel, transLabel } from '../lib/constants.js'
import { Modal, Field, Loader, ResponsiveGrid2, NumInput, SectionHead, Gauge } from './ui.jsx'
import { useMediaQuery } from '../lib/useTouch.js'
import DesktopGarage from './DesktopGarage.jsx'
import { t, useLang, fmtNum } from '../lib/i18n.js'
import CarDetail from './CarDetail.jsx'

function CarFormModal({ open, onClose, onSave }) {
  useLang()
  const [form, setForm] = useState({
    plate: '', brand: '', model: '', year: new Date().getFullYear(),
    transmission: 'Manual', fuel: 'Gasolina', current_km: 0, notes: '',
    vehicle_type: 'coche',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = async () => {
    if (!form.plate || !form.brand || !form.model) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={t('dash.new')}>
      <Field label={t('dash.type')}>
        <div style={{ display: 'flex', gap: 0, border: `1px solid ${theme.border}` }}>
          {VEHICLE_TYPES.map((v, i) => {
            const on = form.vehicle_type === v.value
            return (
              <button key={v.value} type="button" onClick={() => set('vehicle_type', v.value)} style={{
                flex: 1, padding: '11px 8px', cursor: 'pointer', border: 'none',
                borderLeft: i > 0 ? `1px solid ${theme.border}` : 'none',
                background: on ? theme.accent : 'transparent',
                color: on ? theme.accentInk : theme.muted,
                fontFamily: FONT.mono, fontSize: 10, fontWeight: 500,
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>{v.label}</button>
            )
          })}
        </div>
      </Field>
      <ResponsiveGrid2>
        <Field label={t('dash.plate')}><input style={{ ...css.input, ...css.num }} value={form.plate} onChange={e => set('plate', e.target.value)} placeholder="1234 ABC" /></Field>
        <Field label={t('dash.brand')}><input style={css.input} value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="BMW" /></Field>
        <Field label={t('dash.model')}><input style={css.input} value={form.model} onChange={e => set('model', e.target.value)} placeholder="320d" /></Field>
        <Field label={t('dash.year')}><NumInput value={form.year} onChange={e => set('year', +e.target.value)} /></Field>
        <Field label={t('dash.transmission')}>
          <select style={css.select} value={form.transmission} onChange={e => set('transmission', e.target.value)}>
            {TRANS_TYPES.map(v => <option key={v} value={v}>{transLabel(v)}</option>)}
          </select>
        </Field>
        <Field label={t('dash.fuel')}>
          <select style={css.select} value={form.fuel} onChange={e => set('fuel', e.target.value)}>
            {FUEL_TYPES.map(v => <option key={v} value={v}>{fuelLabel(v)}</option>)}
          </select>
        </Field>
        <Field label={t('dash.currentKm')}><NumInput value={form.current_km} onChange={e => set('current_km', +e.target.value)} /></Field>
      </ResponsiveGrid2>
      <Field label={t('dash.notes')}><input style={css.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={t('common.optional')} /></Field>
      <div style={{ ...css.flex, justifyContent: 'flex-end', marginTop: 6, gap: 8 }}>
        <button onClick={onClose} style={css.btnOutline}>{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving} style={css.btn()}>
          <Save size={13} /> {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </Modal>
  )
}

/* Salud del vehículo de 0 a 100: cada mantenimiento al día suma
   entero, cada uno próximo suma medio y cada vencido no suma. */
function health(maint, currentKm) {
  if (!maint || maint.length === 0) return { score: 100, overdue: 0, warn: 0 }
  let ok = 0, warn = 0, overdue = 0
  for (const r of maint) {
    const s = getMaintStatus(r, currentKm)
    if (s === 'ok') ok++
    else if (s === 'warn') warn++
    else overdue++
  }
  return { score: Math.round(((ok + warn * 0.5) / maint.length) * 100), overdue, warn }
}

function VehicleCard({ car, meta, onOpen, onDelete, mob }) {
  useLang()
  const mt = meta || { maint: [], partsCount: 0, itv: null }
  const { score, overdue, warn } = health(mt.maint, car.current_km)
  const gaugeColor = overdue > 0 ? theme.red : warn > 0 ? theme.yellow : theme.green

  let itvBadge = null
  if (mt.itv) {
    const dLeft = mt.itv.expiry_date
      ? Math.floor((new Date(mt.itv.expiry_date) - new Date()) / 86400000)
      : null
    if (mt.itv.result === 'negativa') itvBadge = { bg: theme.redSoft, color: theme.red, text: t('dash.itvNegative') }
    else if (dLeft !== null && dLeft < 0) itvBadge = { bg: theme.redSoft, color: theme.red, text: t('dash.itvExpired') }
    else if (dLeft !== null && dLeft <= 30) itvBadge = { bg: theme.yellowSoft, color: theme.yellow, text: t('dash.itvDays', { n: dLeft }) }
  }

  /* La más apremiante: primero las vencidas, luego las próximas,
     y dentro de cada grupo la que menos kilómetros le quedan. */
  const urgent = (() => {
    const list = (mt.maint || [])
      .map(r => ({ r, status: getMaintStatus(r, car.current_km) }))
      .filter(x => x.status === 'overdue' || x.status === 'warn')
      .sort((a, b) => (a.r.next_km - car.current_km) - (b.r.next_km - car.current_km))
    const first = list[0]
    if (!first) return null
    const type = MAINT_TYPES.find(x => x.id === first.r.type_id)
    return {
      name: type?.name || first.r.type_id,
      status: first.status,
      left: first.r.next_km - car.current_km,
    }
  })()

  const meta1 = [
    `${fmtNum(car.current_km)} ${t('common.km')}`,
    car.year,
    fuelLabel(car.fuel),
    transLabel(car.transmission),
    ...(mt.partsCount > 0 ? [t('dash.parts', { n: mt.partsCount })] : []),
  ]

  return (
    <article
      onClick={onOpen}
      style={{
        background: theme.card, border: `1px solid ${theme.border}`,
        padding: mob ? '13px 13px 13px 60px' : '14px 15px 14px 66px',
        position: 'relative', cursor: 'pointer', transition: 'border-color .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = theme.rule }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border }}
    >
      <div style={{ position: 'absolute', left: mob ? 12 : 15, top: mob ? 14 : 16 }}>
        <Gauge value={score} color={gaugeColor} size={mob ? 36 : 40} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ ...css.h3, fontSize: mob ? 14.5 : 16, flex: 1, minWidth: 0 }}>
          {car.brand} {car.model}
        </h3>
        <span style={{
          ...css.lbl, ...css.num, letterSpacing: '0.09em', color: theme.muted,
          border: `1px solid ${theme.rule}`, padding: '2px 6px', whiteSpace: 'nowrap',
        }}>{car.plate}</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          title={t('common.delete')}
          style={{ background: 'none', border: 'none', color: theme.mutedLight, cursor: 'pointer', display: 'flex', padding: 3 }}
        ><Trash2 size={14} /></button>
      </div>

      <div style={{
        ...css.lbl, letterSpacing: '0.12em', marginTop: 7,
        display: 'flex', gap: 10, flexWrap: 'wrap',
      }}>
        {meta1.map((x, i) => <span key={i}>{x}</span>)}
      </div>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 9 }}>
        {overdue > 0 && <span style={css.badge(theme.redSoft, theme.red)}>{t('dash.overdue', { n: overdue })}</span>}
        {warn > 0 && <span style={css.badge(theme.yellowSoft, theme.yellow)}>{t('dash.upcoming', { n: warn })}</span>}
        {overdue === 0 && warn === 0 && mt.maint.length > 0 && <span style={css.badge(theme.greenSoft, theme.green)}>{t('dash.upToDate')}</span>}
        {mt.maint.length === 0 && <span style={css.badge('transparent', theme.mutedLight)}>{t('dash.noMaint')}</span>}
        {itvBadge && <span style={css.badge(itvBadge.bg, itvBadge.color)}>{itvBadge.text}</span>}
      </div>

      {/* La intervención más urgente, y solo esa: es lo que evita
          tener que entrar en el coche para saber qué toca, sin que
          la ficha crezca hasta ocupar media pantalla. */}
      {urgent && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          borderTop: `1px solid ${theme.border}`, marginTop: 11, paddingTop: 9,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: urgent.status === 'overdue' ? theme.red
              : urgent.status === 'warn' ? theme.yellow : theme.green,
          }} />
          <span style={{
            flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{urgent.name}</span>
          <span style={{ ...css.lbl, ...css.num, fontSize: 10, letterSpacing: '0.04em' }}>
            {fmtNum(urgent.left)} {t('common.km')}
          </span>
        </div>
      )}
    </article>
  )
}

export default function Dashboard({ user, onToast }) {
  useLang()
  const mob = useIsMobile()
  /* 1024 es el iPad mini de lado: a partir de ahí ya compensa el
     raíl. La columna de contexto necesita 1400 para no ahogar la
     tabla, y a 1800 se estira todo. */
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const hasContext = useMediaQuery('(min-width: 1400px)')
  const isXWide = useMediaQuery('(min-width: 1800px)')
  const isTall = useMediaQuery('(min-height: 900px)')
  const [cars, setCars] = useState([])
  const [carMeta, setCarMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [showNewCar, setShowNewCar] = useState(false)
  const [selectedCarId, setSelectedCarId] = useState(null)

  const loadCars = async () => {
    try {
      const data = await getCars(user.id)
      setCars(data)
      const meta = {}
      for (const car of data) {
        const [maint, parts, itv] = await Promise.all([
          getMaintenanceRecords(car.id), getCarParts(car.id), getItvRecords(car.id),
        ])
        meta[car.id] = { maint, partsCount: parts.length, itv: itv[0] || null }
      }
      setCarMeta(meta)
    } catch (err) { onToast(t('dash.loadError') + err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadCars() }, [])

  const handleAddCar = async (form) => {
    try {
      await createCar({ ...form, user_id: user.id })
      setShowNewCar(false); onToast(t('dash.added')); loadCars()
    } catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  const handleDeleteCar = async (id) => {
    if (!confirm(t('dash.deleteConfirm'))) return
    try { await deleteCar(id); onToast(t('dash.deleted')); loadCars() }
    catch (err) { onToast(t('common.error') + ': ' + err.message, 'error') }
  }

  if (selectedCarId) {
    const car = cars.find(c => c.id === selectedCarId)
    if (!car) { setSelectedCarId(null); return null }
    return (
      <div style={css.container}>
        <CarDetail car={car} onBack={() => { setSelectedCarId(null); loadCars() }} onCarUpdated={loadCars} onToast={onToast} />
      </div>
    )
  }

  if (loading) return <Loader text={t('common.loading')} />

  /* A partir de 1280 px hay sitio para el raíl y la ficha al lado.
     Por debajo, la lista de siempre: apretar más solo empeoraría. */
  if (isDesktop && cars.length > 0) {
    return (
      <>
        <DesktopGarage
          cars={cars}
          meta={carMeta}
          wide={isXWide}
          context={hasContext}
          tall={isTall}
          onAdd={() => setShowNewCar(true)}
          onOpenFull={(id) => setSelectedCarId(id)}
          onToast={onToast}
        />
        <CarFormModal open={showNewCar} onClose={() => setShowNewCar(false)} onSave={handleAddCar} />
      </>
    )
  }

  const needAttention = cars.filter(c => {
    const { overdue, warn } = health((carMeta[c.id] || {}).maint, c.current_km)
    return overdue > 0 || warn > 0
  }).length

  return (
    <div style={css.container}>
      <div style={{ paddingTop: mob ? 18 : 26, paddingBottom: 40 }}>
        <SectionHead
          title={t('dash.title')}
          sub={cars.length === 0
            ? t('dash.noneYet')
            : [
                cars.length === 1 ? t('dash.unit') : t('dash.units', { n: cars.length }),
                needAttention === 0
                  ? t('dash.allGood')
                  : needAttention === 1 ? t('dash.needAttention1') : t('dash.needAttention', { n: needAttention }),
              ].join(' · ')}
          action={
            <button onClick={() => setShowNewCar(true)} style={css.btn()}>
              <Plus size={14} /> {t('common.add')}
            </button>
          }
        />

        {cars.length === 0 ? (
          <div style={{
            border: `1px solid ${theme.border}`, background: theme.card,
            padding: 44, textAlign: 'center',
          }}>
            <Car size={32} color={theme.mutedLight} strokeWidth={1.5} />
            <p style={{ ...css.lbl, marginTop: 14 }}>{t('dash.empty')}</p>
            <button onClick={() => setShowNewCar(true)} style={{ ...css.btn(), marginTop: 16 }}>
              <Plus size={14} /> {t('dash.addFirst')}
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid', gap: 10,
            gridTemplateColumns: mob ? '1fr' : 'repeat(auto-fill, minmax(330px, 1fr))',
          }}>
            {cars.map(car => (
              <VehicleCard
                key={car.id}
                car={car}
                meta={carMeta[car.id]}
                mob={mob}
                onOpen={() => setSelectedCarId(car.id)}
                onDelete={() => handleDeleteCar(car.id)}
              />
            ))}
          </div>
        )}
      </div>
      <CarFormModal open={showNewCar} onClose={() => setShowNewCar(false)} onSave={handleAddCar} />
    </div>
  )
}
