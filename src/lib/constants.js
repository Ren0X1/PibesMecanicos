import { t } from './i18n.js'

/* Los identificadores (value, id) NO se traducen nunca: son lo que
   viaja a la base de datos. Lo que se traduce es la etiqueta, y se
   resuelve al pintar, no al definir, porque el idioma puede cambiar
   sin recargar la página. */

export const VEHICLE_TYPES = [
  { value: 'coche', emoji: '🚗', get label() { return t('veh.coche') } },
  { value: 'moto', emoji: '🏍️', get label() { return t('veh.moto') } },
]

export const MAINT_TYPES = [
  // ── Ambos ──
  { id: 'aceite', get name() { return t('maint.aceite') }, emoji: '🛢️', defKm: 10000, defMonths: 12, for: ['coche', 'moto'] },
  { id: 'filtro_aceite', get name() { return t('maint.filtro_aceite') }, emoji: '🔧', defKm: 10000, defMonths: 12, for: ['coche', 'moto'] },
  { id: 'filtro_aire', get name() { return t('maint.filtro_aire') }, emoji: '💨', defKm: 20000, defMonths: 24, for: ['coche', 'moto'] },
  { id: 'pastillas_del', get name() { return t('maint.pastillas_del') }, emoji: '🛑', defKm: 40000, defMonths: 48, for: ['coche', 'moto'] },
  { id: 'pastillas_tras', get name() { return t('maint.pastillas_tras') }, emoji: '🛑', defKm: 50000, defMonths: 60, for: ['coche', 'moto'] },
  { id: 'discos_freno', get name() { return t('maint.discos_freno') }, emoji: '💿', defKm: 70000, defMonths: 72, for: ['coche', 'moto'] },
  { id: 'neumaticos', get name() { return t('maint.neumaticos') }, emoji: '⭕', defKm: 45000, defMonths: 60, for: ['coche', 'moto'] },
  { id: 'liquido_frenos', get name() { return t('maint.liquido_frenos') }, emoji: '💧', defKm: 40000, defMonths: 24, for: ['coche', 'moto'] },
  { id: 'refrigerante', get name() { return t('maint.refrigerante') }, emoji: '❄️', defKm: 50000, defMonths: 24, for: ['coche', 'moto'] },
  { id: 'bateria', get name() { return t('maint.bateria') }, emoji: '🔋', defKm: 60000, defMonths: 48, for: ['coche', 'moto'] },
  { id: 'embrague', get name() { return t('maint.embrague') }, emoji: '🦶', defKm: 120000, defMonths: 0, for: ['coche', 'moto'] },
  { id: 'amortiguadores', get name() { return t('maint.amortiguadores') }, emoji: '🔽', defKm: 80000, defMonths: 72, for: ['coche', 'moto'] },
  // ── Bujías: gasolina (coches+motos) — NO diésel ──
  { id: 'bujias', get name() { return t('maint.bujias') }, emoji: '⚡', defKm: 40000, defMonths: 48, for: ['coche', 'moto'], excludeFuel: ['Diésel'] },
  // ── Calentadores: solo diésel (solo coches) ──
  { id: 'calentadores', get name() { return t('maint.calentadores') }, emoji: '🔥', defKm: 100000, defMonths: 0, for: ['coche'], onlyFuel: ['Diésel'] },
  // ── Solo coches ──
  { id: 'filtro_habitaculo', get name() { return t('maint.filtro_habitaculo') }, emoji: '🌬️', defKm: 15000, defMonths: 12, for: ['coche'] },
  { id: 'correa_dist', get name() { return t('maint.correa_dist') }, emoji: '⛓️', defKm: 120000, defMonths: 60, for: ['coche'] },
  { id: 'diferencial', get name() { return t('maint.diferencial') }, emoji: '⚙️', defKm: 60000, defMonths: 60, for: ['coche'] },
  { id: 'caja_cambios', get name() { return t('maint.caja_cambios') }, emoji: '🔄', defKm: 60000, defMonths: 60, for: ['coche'] },
  { id: 'escobillas', get name() { return t('maint.escobillas') }, emoji: '🧹', defKm: 0, defMonths: 12, for: ['coche'] },
  // ── Solo motos ──
  { id: 'cadena', get name() { return t('maint.cadena') }, emoji: '⛓️', defKm: 25000, defMonths: 36, for: ['moto'] },
  { id: 'kit_arrastre', get name() { return t('maint.kit_arrastre') }, emoji: '🔗', defKm: 25000, defMonths: 36, for: ['moto'] },
  { id: 'liquido_embrague', get name() { return t('maint.liquido_embrague') }, emoji: '💧', defKm: 40000, defMonths: 24, for: ['moto'] },
]

export function getMaintenanceForVehicle(vehicleType, fuelType) {
  return MAINT_TYPES.filter(m => {
    if (!m.for.includes(vehicleType || 'coche')) return false
    if (m.excludeFuel && m.excludeFuel.includes(fuelType)) return false
    if (m.onlyFuel && !m.onlyFuel.includes(fuelType)) return false
    return true
  })
}

/* Los valores se guardan en castellano por compatibilidad con lo
   que ya hay en la base de datos; solo cambia cómo se muestran. */
export const FUEL_TYPES = ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'GLP']
export const fuelLabel = (v) => t(`fuel.${v}`)
export const TRANS_TYPES = ['Manual', 'Automático']
export const transLabel = (v) => t(`trans.${v}`)

export const DRIVE_MODES = ['ciudad', 'mixto', 'carretera']
export const driveLabel = (v) => t(`drive.${v}`)

export function getMaintStatus(maint, currentKm) {
  if (!maint) return null
  const kmLeft = maint.next_km - currentKm
  const hasDate = maint.next_date && maint.next_date !== ''
  let daysLeft = null
  if (hasDate) {
    const nextDate = new Date(maint.next_date)
    daysLeft = Math.floor((nextDate - new Date()) / 86400000)
  }
  // Check km (always) and date (only if set)
  if (kmLeft <= 0 || (daysLeft !== null && daysLeft <= 0)) return 'overdue'
  if (kmLeft <= 2000 || (daysLeft !== null && daysLeft <= 30)) return 'warn'
  return 'ok'
}

/* Se mantiene el nombre por compatibilidad, pero ahora respeta el
   idioma: en alemán es 07.09.2026 y en chino 2026/09/07. */
export { fmtDate as formatDate } from './i18n.js'
