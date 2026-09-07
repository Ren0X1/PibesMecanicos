/* ─────────────────────────────────────────────────────────────
   Datos de ejemplo para /demo

   Todas las fechas son relativas al día en que se abre la demo,
   de modo que nunca se ven avisos caducados hace dos años ni una
   ITV que venció antes de que existiera la aplicación.
   ───────────────────────────────────────────────────────────── */

const DAY = 86400000
const iso = (d) => new Date(d).toISOString().slice(0, 10)
const ago = (n) => iso(Date.now() - n * DAY)
const ahead = (n) => iso(Date.now() + n * DAY)
const tsAgo = (n) => new Date(Date.now() - n * DAY).toISOString()

export const DEMO_USER_ID = 'u-demo'

export function buildSeed() {
  const profiles = [
    { id: DEMO_USER_ID, name: 'Alejandro', username: 'alejandro', email: null, pin: '0000', role: 'admin', pin_change_required: false,
      lang: null, theme: null, accent: null, onboarded_at: null, created_at: tsAgo(420) },
    { id: 'u-marcos',   name: 'Marcos',    username: 'marcos',    email: null, pin: '0000', role: 'user',  pin_change_required: false, lang: 'es', theme: 'dark', accent: 'mandarina', onboarded_at: tsAgo(390), created_at: tsAgo(390) },
    { id: 'u-nuria',    name: 'Nuria',     username: 'nuria',     email: null, pin: '0000', role: 'user',  pin_change_required: false, lang: 'es', theme: 'dark', accent: 'mandarina', onboarded_at: tsAgo(310), created_at: tsAgo(310) },
    { id: 'u-javi',     name: 'Javi',      username: 'javi',      email: null, pin: '0000', role: 'user',  pin_change_required: false, lang: 'es', theme: 'dark', accent: 'mandarina', onboarded_at: tsAgo(180), created_at: tsAgo(180) },
  ]

  const cars = [
    { id: 'c-bmw', user_id: DEMO_USER_ID, plate: '4821 KLM', brand: 'BMW', model: '320d Touring', year: 2016,
      transmission: 'Automático', fuel: 'Diésel', current_km: 187450, vehicle_type: 'coche',
      notes: 'Comprado con 96.000 km. Distribución hecha en el 2023.', created_at: tsAgo(400), updated_at: tsAgo(3) },
    { id: 'c-mt07', user_id: DEMO_USER_ID, plate: '9137 PRT', brand: 'Yamaha', model: 'MT-07', year: 2021,
      transmission: 'Manual', fuel: 'Gasolina', current_km: 24310, vehicle_type: 'moto',
      notes: 'Escape de serie guardado en el trastero.', created_at: tsAgo(280), updated_at: tsAgo(9) },
    { id: 'c-leon', user_id: 'u-marcos', plate: '2764 FHD', brand: 'Seat', model: 'León 1.5 TSI', year: 2019,
      transmission: 'Manual', fuel: 'Gasolina', current_km: 78900, vehicle_type: 'coche',
      notes: '', created_at: tsAgo(240), updated_at: tsAgo(20) },
    { id: 'c-vespa', user_id: 'u-nuria', plate: '5502 JBZ', brand: 'Vespa', model: 'Primavera 125', year: 2022,
      transmission: 'Automático', fuel: 'Gasolina', current_km: 9840, vehicle_type: 'moto',
      notes: '', created_at: tsAgo(150), updated_at: tsAgo(31) },
  ]

  /* El BMW llega con dos vencidos y dos próximos: es lo que hace que
     el indicador de la ficha baje y se entienda de un vistazo. */
  const maintenance_records = [
    m('c-bmw', 'pastillas_del', 147000, ago(300), 187100, null, 138.4, 'Pastillas Brembo, montadas en el taller de Nacho'),
    m('c-bmw', 'filtro_aire',   166200, ago(210), 186200, null, 24.9,  ''),
    m('c-bmw', 'aceite',        178000, ago(120), 188000, ahead(45), 96.5, '5W30 long life, 7 litros'),
    m('c-bmw', 'filtro_aceite', 178000, ago(120), 188000, ahead(45), 14.2, ''),
    m('c-bmw', 'correa_dist',   112000, ago(700), 232000, null, 612.0, 'Kit completo con bomba de agua'),
    m('c-bmw', 'neumaticos',    158000, ago(260), 203000, null, 428.0, 'Michelin Primacy 4'),
    m('c-bmw', 'bateria',       150000, ago(340), 210000, ahead(400), 121.0, ''),
    m('c-bmw', 'liquido_frenos',158000, ago(260), 198000, ahead(180), 42.0, ''),

    m('c-mt07', 'aceite',       18200, ago(150), 27200, ahead(210), 58.0, 'Yamalube 10W40'),
    m('c-mt07', 'filtro_aceite',18200, ago(150), 27200, ahead(210), 11.5, ''),
    m('c-mt07', 'cadena',       12000, ago(300), 34000, null, 0, 'Engrasada cada 800 km'),
    m('c-mt07', 'pastillas_del',10500, ago(330), 45500, null, 74.0, ''),
    m('c-mt07', 'neumaticos',   11000, ago(320), 45000, null, 310.0, 'Michelin Road 5'),

    m('c-leon', 'aceite',       68000, ago(190), 78000, ahead(10), 82.0, ''),
    m('c-leon', 'filtro_aire',  60000, ago(320), 80000, null, 21.0, ''),

    m('c-vespa','aceite',       5200,  ago(200), 10200, ahead(120), 34.0, ''),
  ]

  const km_logs = [
    k('c-bmw', 187450, ago(3)), k('c-bmw', 186100, ago(24)), k('c-bmw', 184300, ago(52)),
    k('c-bmw', 182050, ago(85)), k('c-bmw', 179800, ago(118)),
    k('c-mt07', 24310, ago(9)), k('c-mt07', 23480, ago(38)), k('c-mt07', 22100, ago(74)),
  ]

  /* Repostajes: el consumo se calcula entre depósitos llenos, así que
     hacen falta varios seguidos para que salgan las medias. */
  const fuel_logs = [
    f('c-bmw', 187300, ago(6),   52.4, 1.489, 'carretera'),
    f('c-bmw', 186480, ago(21),  48.9, 1.512, 'mixto'),
    f('c-bmw', 185640, ago(35),  50.2, 1.475, 'mixto'),
    f('c-bmw', 184760, ago(49),  46.8, 1.538, 'ciudad'),
    f('c-bmw', 183900, ago(66),  51.7, 1.501, 'carretera'),
    f('c-bmw', 183010, ago(82),  49.3, 1.462, 'mixto'),
    f('c-bmw', 182140, ago(97),  47.5, 1.523, 'ciudad'),
    f('c-bmw', 181220, ago(115), 53.1, 1.494, 'carretera'),
    f('c-bmw', 180310, ago(132), 48.2, 1.470, 'mixto'),

    f('c-mt07', 24280, ago(11),  13.4, 1.629, 'carretera'),
    f('c-mt07', 24010, ago(29),  12.8, 1.655, 'mixto'),
    f('c-mt07', 23720, ago(46),  13.1, 1.611, 'mixto'),
    f('c-mt07', 23400, ago(68),  12.6, 1.640, 'ciudad'),
    f('c-mt07', 23090, ago(91),  13.3, 1.598, 'carretera'),
  ]

  const car_parts = [
    { id: 'p-1', car_id: 'c-bmw',  name: 'Filtro de aceite', reference: 'MANN HU 719/7 X', url: '', created_at: tsAgo(120) },
    { id: 'p-2', car_id: 'c-bmw',  name: 'Filtro de habitáculo', reference: 'MANN CUK 2939', url: '', created_at: tsAgo(120) },
    { id: 'p-3', car_id: 'c-bmw',  name: 'Pastillas delanteras', reference: 'BREMBO P06 040', url: '', created_at: tsAgo(300) },
    { id: 'p-4', car_id: 'c-mt07', name: 'Kit de arrastre', reference: 'DID 520VX3 · 16/43', url: '', created_at: tsAgo(180) },
  ]

  const itv_records = [
    { id: 'i-1', car_id: 'c-bmw', inspection_date: ago(347), expiry_date: ahead(18), result: 'favorable',
      station: 'ITV Málaga · Guadalhorce', defects: '', resolved: true, cost: 41.6, notes: '', created_at: tsAgo(347) },
    { id: 'i-2', car_id: 'c-bmw', inspection_date: ago(712), expiry_date: ago(347), result: 'desfavorable',
      station: 'ITV Málaga · Guadalhorce', defects: 'Holgura en bieleta delantera izquierda', resolved: true, cost: 41.6, notes: 'Repasada y aprobada a la semana', created_at: tsAgo(712) },
    { id: 'i-3', car_id: 'c-mt07', inspection_date: ago(60), expiry_date: ahead(670), result: 'favorable',
      station: 'ITV Málaga · Guadalhorce', defects: '', resolved: true, cost: 28.9, notes: '', created_at: tsAgo(60) },
  ]

  const vehicle_todos = [
    { id: 't-1', car_id: 'c-bmw',  title: 'Pedir cita para las pastillas', notes: 'Llamar al taller de Nacho', priority: 'alta',  completed: false, completed_at: null, created_at: tsAgo(6) },
    { id: 't-2', car_id: 'c-bmw',  title: 'Mirar el ruido del rodamiento trasero', notes: 'Se oye a partir de 90 km/h', priority: 'media', completed: false, completed_at: null, created_at: tsAgo(14) },
    { id: 't-3', car_id: 'c-bmw',  title: 'Cambiar escobillas', notes: '', priority: 'baja', completed: true, completed_at: tsAgo(30), created_at: tsAgo(48) },
    { id: 't-4', car_id: 'c-mt07', title: 'Tensar la cadena', notes: 'Toca cada 800 km', priority: 'media', completed: false, completed_at: null, created_at: tsAgo(9) },
  ]

  const reminders = [
    { id: 'r-1', user_id: DEMO_USER_ID, title: 'Renovar el seguro del BMW', notes: 'Pedir precio también en Mutua', due_date: ahead(24), car_id: 'c-bmw', completed: false, completed_at: null, created_at: tsAgo(12) },
    { id: 'r-2', user_id: DEMO_USER_ID, title: 'Pasar la ITV',              notes: 'Cita previa por la web', due_date: ahead(18), car_id: 'c-bmw', completed: false, completed_at: null, created_at: tsAgo(12) },
    { id: 'r-3', user_id: DEMO_USER_ID, title: 'Comprar anticongelante',    notes: '', due_date: ahead(60), car_id: null, completed: false, completed_at: null, created_at: tsAgo(5) },
    { id: 'r-4', user_id: DEMO_USER_ID, title: 'Lavar y encerar la moto',   notes: '', due_date: ago(4), car_id: 'c-mt07', completed: true, completed_at: tsAgo(4), created_at: tsAgo(20) },
  ]

  const workshops = [
    { id: 'w-1', name: 'Talleres Nacho',        phone: '+34600111222', address: 'Pol. Ind. San Luis, Málaga', rating: 5, specialty: 'Mecánica general', notes: 'De confianza. Avisa antes de tocar nada.', created_by: DEMO_USER_ID, created_at: tsAgo(200) },
    { id: 'w-2', name: 'Neumáticos del Sur',    phone: '+34600333444', address: 'Av. Velázquez 118, Málaga',  rating: 4, specialty: 'Neumáticos y alineado', notes: 'Bien de precio, tardan un poco.', created_by: 'u-marcos', created_at: tsAgo(150) },
    { id: 'w-3', name: 'MotoTaller Guadalmar',  phone: '+34600555666', address: 'C/ Cañaveral 4, Málaga',     rating: 5, specialty: 'Motos',              notes: 'Los únicos que tocan la MT sin dejar marcas.', created_by: DEMO_USER_ID, created_at: tsAgo(90) },
  ]

  const groups = [
    { id: 'g-1', name: 'Los Colegones', created_by: DEMO_USER_ID, status: 'approved', created_at: tsAgo(220) },
    { id: 'g-2', name: 'Ruta de los domingos', created_by: 'u-javi', status: 'approved', created_at: tsAgo(70) },
    { id: 'g-3', name: 'Clásicos Málaga', created_by: 'u-nuria', status: 'pending', created_at: tsAgo(4) },
  ]

  const group_members = [
    { id: 'gm-1', group_id: 'g-1', user_id: DEMO_USER_ID, joined_at: tsAgo(220) },
    { id: 'gm-2', group_id: 'g-1', user_id: 'u-marcos',   joined_at: tsAgo(215) },
    { id: 'gm-3', group_id: 'g-1', user_id: 'u-nuria',    joined_at: tsAgo(190) },
    { id: 'gm-4', group_id: 'g-2', user_id: 'u-javi',     joined_at: tsAgo(70) },
  ]

  const group_invitations = [
    { id: 'gi-1', group_id: 'g-2', user_id: DEMO_USER_ID, invited_by: 'u-javi', status: 'pending', created_at: tsAgo(2) },
  ]

  const group_messages = [
    gmsg('g-1', 'u-marcos',   '¿Alguien sabe de alguien que haga chapa decente por Málaga?', 9),
    gmsg('g-1', DEMO_USER_ID, 'Nacho no hace chapa, pero seguro que te pasa un contacto.', 9),
    gmsg('g-1', 'u-nuria',    'Yo llevé la Vespa a Guadalmar y quedó fina.', 8),
    gmsg('g-1', 'u-marcos',   'Voy a llamar entonces, gracias.', 8),
    gmsg('g-1', DEMO_USER_ID, 'Por cierto, a mí me toca ITV en tres semanas. Aviso por si alguien la tiene cerca y vamos juntos.', 3),
    gmsg('g-1', 'u-nuria',    'A mí me toca en verano, pero te acompaño igual.', 2),
  ]

  return {
    profiles, cars, km_logs, maintenance_records, car_parts, fuel_logs,
    itv_records, workshops, groups, group_members, group_messages,
    group_invitations, vehicle_todos, reminders,
  }
}

// ─── Constructores auxiliares ───

let seq = 0
const uid = (p) => `${p}-${++seq}`

function m(car_id, type_id, last_km, last_date, next_km, next_date, cost, notes) {
  return {
    id: uid('m'), car_id, type_id, last_km, last_date, next_km, next_date,
    cost, notes, created_at: new Date(last_date).toISOString(), updated_at: new Date(last_date).toISOString(),
  }
}

function k(car_id, km, date) {
  return { id: uid('k'), car_id, km, date, notes: '', created_at: new Date(date).toISOString() }
}

function f(car_id, km, date, liters, price_liter, driving_mode) {
  return {
    id: uid('f'), car_id, km, date, liters, price_liter,
    total_cost: Math.round(liters * price_liter * 100) / 100,
    full_tank: true, driving_mode, notes: '', created_at: new Date(date).toISOString(),
  }
}

function gmsg(group_id, user_id, message, daysAgo) {
  return { id: uid('gx'), group_id, user_id, message, created_at: tsAgo(daysAgo) }
}
