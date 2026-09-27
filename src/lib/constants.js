import { t } from './i18n.js'

/* Los identificadores (value, id) NO se traducen nunca: son lo que
   viaja a la base de datos. Lo que se traduce es la etiqueta, y se
   resuelve al pintar, no al definir, porque el idioma puede cambiar
   sin recargar la página. */

export const VEHICLE_TYPES = [
  { value: 'coche', emoji: '🚗', get label() { return t('veh.coche') } },
  { value: 'moto', emoji: '🏍️', get label() { return t('veh.moto') } },
]

/* ─────────────────────────────────────────────────────────────
   Las piezas que van por eje

   Neumáticos, pastillas, discos, amortiguadores y silentblocks no
   son una pieza: son dos ejes, y en un coche cada eje son dos
   lados. Por eso cada eje es su propio tipo (`neumaticos_del`,
   `neumaticos_tras`...) con `axle` y `sides`.

   `sides: true` significa «este eje tiene lado izquierdo y
   derecho». En moto no lo tiene: una rueda delante y otra detrás,
   así que ahí se apunta el eje entero. Eso lo decide hasSides(),
   no el tipo por sí solo.

   `nameMoto` y `defKmMoto` existen porque una moto no es un coche
   pequeño: el neumático trasero se come en 12.000 km lo que un
   coche estira a 45.000, y lo que delante es «horquilla» aquí se
   llamaba «amortiguadores delanteros».
   ───────────────────────────────────────────────────────────── */

export const MAINT_TYPES = [
  // ── Ambos ──
  { id: 'aceite', get name() { return t('maint.aceite') }, emoji: '🛢️', defKm: 10000, defMonths: 12, for: ['coche', 'moto'] },
  { id: 'filtro_aceite', get name() { return t('maint.filtro_aceite') }, emoji: '🔧', defKm: 10000, defMonths: 12, for: ['coche', 'moto'] },
  { id: 'filtro_aire', get name() { return t('maint.filtro_aire') }, emoji: '💨', defKm: 20000, defMonths: 24, for: ['coche', 'moto'] },

  // ── Por eje: frenos ──
  { id: 'pastillas_del', get name() { return t('maint.pastillas_del') }, emoji: '🛑', defKm: 40000, defKmMoto: 20000, defMonths: 48, for: ['coche', 'moto'], axle: 'del', sides: true },
  { id: 'pastillas_tras', get name() { return t('maint.pastillas_tras') }, emoji: '🛑', defKm: 50000, defKmMoto: 30000, defMonths: 60, for: ['coche', 'moto'], axle: 'tras', sides: true },
  { id: 'discos_del', get name() { return t('maint.discos_del') }, get nameMoto() { return t('maint.discos_del_moto') }, emoji: '💿', defKm: 70000, defKmMoto: 40000, defMonths: 72, for: ['coche', 'moto'], axle: 'del', sides: true },
  { id: 'discos_tras', get name() { return t('maint.discos_tras') }, get nameMoto() { return t('maint.discos_tras_moto') }, emoji: '💿', defKm: 70000, defKmMoto: 40000, defMonths: 72, for: ['coche', 'moto'], axle: 'tras', sides: true },

  // ── Por eje: ruedas y suspensión ──
  { id: 'neumaticos_del', get name() { return t('maint.neumaticos_del') }, get nameMoto() { return t('maint.neumaticos_del_moto') }, emoji: '⭕', defKm: 45000, defKmMoto: 20000, defMonths: 60, for: ['coche', 'moto'], axle: 'del', sides: true },
  { id: 'neumaticos_tras', get name() { return t('maint.neumaticos_tras') }, get nameMoto() { return t('maint.neumaticos_tras_moto') }, emoji: '⭕', defKm: 45000, defKmMoto: 12000, defMonths: 60, for: ['coche', 'moto'], axle: 'tras', sides: true },
  { id: 'amortiguadores_del', get name() { return t('maint.amortiguadores_del') }, get nameMoto() { return t('maint.amortiguadores_del_moto') }, emoji: '🔽', defKm: 80000, defKmMoto: 40000, defMonths: 72, for: ['coche', 'moto'], axle: 'del', sides: true },
  { id: 'amortiguadores_tras', get name() { return t('maint.amortiguadores_tras') }, get nameMoto() { return t('maint.amortiguadores_tras_moto') }, emoji: '🔽', defKm: 80000, defKmMoto: 40000, defMonths: 72, for: ['coche', 'moto'], axle: 'tras', sides: true },

  // ── Resto de ambos ──
  { id: 'liquido_frenos', get name() { return t('maint.liquido_frenos') }, emoji: '💧', defKm: 40000, defMonths: 24, for: ['coche', 'moto'] },
  { id: 'refrigerante', get name() { return t('maint.refrigerante') }, emoji: '❄️', defKm: 50000, defMonths: 24, for: ['coche', 'moto'] },
  { id: 'bateria', get name() { return t('maint.bateria') }, emoji: '🔋', defKm: 60000, defMonths: 48, for: ['coche', 'moto'] },
  { id: 'embrague', get name() { return t('maint.embrague') }, emoji: '🦶', defKm: 120000, defMonths: 0, for: ['coche', 'moto'] },
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
  /* Silentblocks y rótulas no llevan intervalo: se cambian cuando
     suenan, no cada tantos kilómetros. Sin próximo previsto no hay
     aviso, y eso está bien: lo que interesa es tener apuntado
     cuándo se hizo y lo que costó. */
  { id: 'silentblocks_del', get name() { return t('maint.silentblocks_del') }, emoji: '🔩', defKm: 0, defMonths: 0, for: ['coche'], axle: 'del', sides: true },
  { id: 'silentblocks_tras', get name() { return t('maint.silentblocks_tras') }, emoji: '🔩', defKm: 0, defMonths: 0, for: ['coche'], axle: 'tras', sides: true },
  // ── Solo motos ──
  { id: 'cadena', get name() { return t('maint.cadena') }, emoji: '⛓️', defKm: 25000, defMonths: 36, for: ['moto'] },
  { id: 'kit_arrastre', get name() { return t('maint.kit_arrastre') }, emoji: '🔗', defKm: 25000, defMonths: 36, for: ['moto'] },
  { id: 'liquido_embrague', get name() { return t('maint.liquido_embrague') }, emoji: '💧', defKm: 40000, defMonths: 24, for: ['moto'] },
  /* El equivalente en moto de los silentblocks: tampoco lleva
     intervalo. */
  { id: 'rodamientos', get name() { return t('maint.rodamientos') }, emoji: '🔩', defKm: 0, defMonths: 0, for: ['moto'] },
]

export function getMaintenanceForVehicle(vehicleType, fuelType) {
  return MAINT_TYPES.filter(m => {
    if (!m.for.includes(vehicleType || 'coche')) return false
    if (m.excludeFuel && m.excludeFuel.includes(fuelType)) return false
    if (m.onlyFuel && !m.onlyFuel.includes(fuelType)) return false
    return true
  })
}

/* ─── Lo que cambia entre un coche y una moto ─── */

export const maintName = (mt, vehicleType) =>
  (vehicleType === 'moto' && mt?.nameMoto) ? mt.nameMoto : (mt?.name || '')

export const maintDefKm = (mt, vehicleType) =>
  (vehicleType === 'moto' && mt?.defKmMoto != null) ? mt.defKmMoto : (mt?.defKm || 0)

export const maintDefMonths = (mt, vehicleType) =>
  (vehicleType === 'moto' && mt?.defMonthsMoto != null) ? mt.defMonthsMoto : (mt?.defMonths || 0)

/* Una moto no tiene izquierdo y derecho: tiene delante y detrás. */
export const hasSides = (mt, vehicleType) =>
  Boolean(mt?.sides) && vehicleType !== 'moto'

/* ─── Los dos lados de un eje ─── */

export const SIDES = ['izq', 'der']
export const sideLabel = (side) => t(`side.${side}`)

/* La abreviatura para donde no cabe la palabra entera: una columna
   de tabla. No se corta la palabra larga, que en inglés daba «LEF»;
   cada idioma trae la suya. */
export const sideShort = (side) => t(`side.${side}Short`)

export const hasSideData = (r) =>
  Boolean(r && (r.last_km_izq != null || r.last_km_der != null))

/* De los pares {km, date} que tengan datos, el más atrasado: el que
   decide cuándo toca. Un lado sin datos no se puede proyectar, así
   que se ignora aquí y se enseña como «—» en la ficha. */
export function worstOf(pairs) {
  const conDatos = (pairs || []).filter(p => p && p.km != null && p.km !== '')
  if (!conDatos.length) return null
  return conDatos.reduce((a, b) => (Number(b.km) < Number(a.km) ? b : a))
}

/* El lado que peor está, para poder decirlo en el aviso: «pastillas
   delanteras — la derecha». Un lado sin datos es el peor de todos,
   porque no consta que se haya tocado nunca. */
export function worstSide(record) {
  if (!record) return null
  const izq = record.last_km_izq, der = record.last_km_der
  const hayIzq = izq != null, hayDer = der != null
  if (!hayIzq && !hayDer) return null
  if (!hayIzq) return 'izq'
  if (!hayDer) return 'der'
  if (Number(izq) !== Number(der)) return Number(izq) < Number(der) ? 'izq' : 'der'
  const fi = record.last_date_izq || '', fd = record.last_date_der || ''
  if (fi !== fd) return fi < fd ? 'izq' : 'der'
  return null   // los dos igual: no hay uno peor que otro
}

/* «Pastillas delanteras — derecho»: el nombre del elemento y, si un
   lado está peor que el otro, cuál de los dos manda. Es lo que se
   lee en los avisos y en las notificaciones, donde no hay sitio
   para pintar los dos lados. */
export function maintLabel(mt, record, vehicleType) {
  const base = maintName(mt, vehicleType)
  if (!hasSides(mt, vehicleType) || !hasSideData(record)) return base
  const peor = worstSide(record)
  return peor ? `${base} — ${sideLabel(peor)}` : base
}

/* Cuándo toca el siguiente, a partir de un cambio. Sin intervalo de
   km el próximo se queda en cero, que getMaintStatus lee como «esta
   pieza no se mide en kilómetros». */
export function nextFrom(lastKm, lastDate, mt, vehicleType) {
  const km = maintDefKm(mt, vehicleType)
  const meses = maintDefMonths(mt, vehicleType)
  const next_km = km ? Number(lastKm || 0) + km : 0
  let next_date = ''
  if (lastDate && meses) {
    const d = new Date(lastDate)
    d.setMonth(d.getMonth() + meses)
    next_date = d.toISOString().split('T')[0]
  }
  return { next_km, next_date }
}

/* Los resultados de una ITV. El valor se guarda en castellano
   —viene de la base— y la etiqueta se resuelve al pintar, como
   todo lo demás. Vivía dentro de ItvCard, y por eso la ficha que
   ven los amigos enseñaba «favorable» sin traducir. */
export const ITV_RESULTS = [
  { value: 'favorable', get label() { return t('itv.favorable') } },
  { value: 'desfavorable', get label() { return t('itv.unfavorable') } },
  { value: 'negativa', get label() { return t('itv.negative') } },
]

export const itvResultLabel = (v) =>
  ITV_RESULTS.find(r => r.value === v)?.label || v

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
  /* Un próximo en cero no es «vencido hace doscientos mil»: es que
     esta pieza no se mide en kilómetros (silentblocks, rótulas).
     Antes salía en rojo nada más apuntarla. */
  const hasKm = Number(maint.next_km) > 0
  const kmLeft = maint.next_km - currentKm
  const hasDate = maint.next_date && maint.next_date !== ''
  let daysLeft = null
  if (hasDate) {
    const nextDate = new Date(maint.next_date)
    daysLeft = Math.floor((nextDate - new Date()) / 86400000)
  }
  // Sin kilómetros y sin fecha no hay nada que pueda vencer.
  if (!hasKm && daysLeft === null) return 'ok'
  if ((hasKm && kmLeft <= 0) || (daysLeft !== null && daysLeft <= 0)) return 'overdue'
  if ((hasKm && kmLeft <= 2000) || (daysLeft !== null && daysLeft <= 30)) return 'warn'
  return 'ok'
}

/* Se mantiene el nombre por compatibilidad, pero ahora respeta el
   idioma: en alemán es 07.09.2026 y en chino 2026/09/07. */
export { fmtDate as formatDate } from './i18n.js'
