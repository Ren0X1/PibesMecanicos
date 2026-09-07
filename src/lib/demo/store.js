/* ─────────────────────────────────────────────────────────────
   Almacén de la demo

   Implementa exactamente la misma API que src/lib/supabase.js,
   pero contra un objeto en memoria que se guarda en localStorage.
   Ni una sola petición de red: la demo funciona sin claves, sin
   base de datos y sin conexión.

   Los cambios que haga el visitante se conservan mientras no
   vacíe el navegador o pulse «Reiniciar demo».
   ───────────────────────────────────────────────────────────── */

import { buildSeed, DEMO_USER_ID } from './seed.js'
import { K, remove as dropKeys } from '../storageKeys.js'

const KEY = K.demoDb

let db = load()

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  const fresh = buildSeed()
  persist(fresh)
  return fresh
}

function persist(next = db) {
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
}

/* Reiniciar la demo la deja EXACTAMENTE como recién abierta. No
   basta con rehacer los datos: los avisos silenciados, el asistente
   de bienvenida y el aviso del gesto viven fuera de la base y, si
   no se borran, el visitante que reinicia se queda a medias. */
export function resetDemo() {
  db = buildSeed()
  persist()
  dropKeys(
    K.snoozed(DEMO_USER_ID),   // avisos ocultados los 10 días
    K.onboarded(DEMO_USER_ID), // respuesta al asistente
    K.swipeHint,               // aviso del gesto de deslizar
  )
}

export { DEMO_USER_ID }

export function getDemoUser() {
  return clone(db.profiles.find(p => p.id === DEMO_USER_ID))
}

// ─── Utilidades ───

const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)))
const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const now = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)

/* Todas las funciones son async para que el resto de la aplicación
   no note ninguna diferencia con la versión real. */
const ok = (value) => Promise.resolve(clone(value))

const byAsc = (field) => (a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? ''))
const byDesc = (field) => (a, b) => String(b[field] ?? '').localeCompare(String(a[field] ?? ''))

const profileOf = (id) => {
  const p = db.profiles.find(x => x.id === id)
  return p ? { id: p.id, name: p.name, username: p.username } : null
}

const carOf = (id) => {
  const c = db.cars.find(x => x.id === id)
  return c ? { brand: c.brand, model: c.model, plate: c.plate, vehicle_type: c.vehicle_type } : null
}

function remove(table, predicate) {
  db[table] = db[table].filter(r => !predicate(r))
}

// ─── Perfiles ───

export async function login(username, pin) {
  const u = db.profiles.find(
    p => p.username.toLowerCase() === String(username).trim().toLowerCase() && p.pin === pin
  )
  if (!u) throw new Error('Usuario o PIN incorrecto')
  return ok(u)
}

export async function getProfiles() {
  return ok([...db.profiles].sort(byAsc('created_at')))
}

export async function createProfile({ name, username, pin, role = 'user' }) {
  const clean = String(username).toLowerCase().trim()
  if (db.profiles.some(p => p.username === clean)) throw new Error('Ese usuario ya existe')
  const row = {
    id: uid('u'), name, username: clean, email: null, pin,
    role, pin_change_required: false, created_at: now(),
  }
  db.profiles.push(row); persist()
  return ok(row)
}

export async function updateProfile(id, updates) {
  const row = db.profiles.find(p => p.id === id)
  if (!row) throw new Error('Usuario no encontrado')
  Object.assign(row, updates); persist()
  return ok(row)
}

export async function deleteProfile(id) {
  remove('profiles', p => p.id === id)
  const carIds = db.cars.filter(c => c.user_id === id).map(c => c.id)
  remove('cars', c => c.user_id === id)
  carIds.forEach(cid => cascadeCar(cid))
  remove('group_members', m => m.user_id === id)
  remove('reminders', r => r.user_id === id)
  persist()
}

// ─── Vehículos ───

function cascadeCar(carId) {
  remove('km_logs', r => r.car_id === carId)
  remove('maintenance_records', r => r.car_id === carId)
  remove('car_parts', r => r.car_id === carId)
  remove('fuel_logs', r => r.car_id === carId)
  remove('itv_records', r => r.car_id === carId)
  remove('vehicle_todos', r => r.car_id === carId)
  db.reminders.forEach(r => { if (r.car_id === carId) r.car_id = null })
}

export async function getCars(userId) {
  return ok(db.cars.filter(c => c.user_id === userId).sort(byAsc('created_at')))
}

export async function createCar(car) {
  const row = {
    id: uid('c'), vehicle_type: 'coche', notes: '', current_km: 0,
    transmission: 'Manual', fuel: 'Gasolina',
    ...car, created_at: now(), updated_at: now(),
  }
  db.cars.push(row); persist()
  return ok(row)
}

export async function updateCar(id, updates) {
  const row = db.cars.find(c => c.id === id)
  if (!row) throw new Error('Vehículo no encontrado')
  Object.assign(row, updates, { updated_at: now() }); persist()
  return ok(row)
}

export async function deleteCar(id) {
  remove('cars', c => c.id === id)
  cascadeCar(id); persist()
}

// ─── Historial de kilómetros ───

export async function getKmLogs(carId) {
  return ok(db.km_logs.filter(r => r.car_id === carId).sort(byDesc('date')))
}

export async function createKmLog(log) {
  const row = { id: uid('k'), notes: '', date: today(), ...log, created_at: now() }
  db.km_logs.push(row); persist()
  return ok(row)
}

export async function deleteKmLog(id) {
  remove('km_logs', r => r.id === id); persist()
}

// ─── Mantenimientos ───

export async function getMaintenanceRecords(carId) {
  return ok(db.maintenance_records.filter(r => r.car_id === carId).sort(byAsc('type_id')))
}

export async function upsertMaintenanceRecord(record) {
  const existing = db.maintenance_records.find(
    r => r.car_id === record.car_id && r.type_id === record.type_id
  )
  if (existing) {
    Object.assign(existing, {
      last_km: record.last_km, last_date: record.last_date,
      next_km: record.next_km, next_date: record.next_date,
      cost: record.cost, notes: record.notes, updated_at: now(),
    })
    persist()
    return ok(existing)
  }
  const row = { id: uid('m'), cost: 0, notes: '', ...record, created_at: now(), updated_at: now() }
  db.maintenance_records.push(row); persist()
  return ok(row)
}

export async function deleteMaintenanceRecord(carId, typeId) {
  remove('maintenance_records', r => r.car_id === carId && r.type_id === typeId)
  persist()
}

// ─── Recambios ───

export async function getCarParts(carId) {
  return ok(db.car_parts.filter(r => r.car_id === carId).sort(byDesc('created_at')))
}

export async function createCarPart(part) {
  const row = { id: uid('p'), reference: '', url: '', ...part, created_at: now() }
  db.car_parts.push(row); persist()
  return ok(row)
}

export async function deleteCarPart(id) {
  remove('car_parts', r => r.id === id); persist()
}

// ─── Repostajes ───

export async function getFuelLogs(carId) {
  return ok(db.fuel_logs.filter(r => r.car_id === carId).sort(byDesc('date')))
}

export async function createFuelLog(log) {
  const row = {
    id: uid('f'), full_tank: true, driving_mode: 'ciudad', notes: '', date: today(),
    ...log, created_at: now(),
  }
  db.fuel_logs.push(row); persist()
  return ok(row)
}

export async function deleteFuelLog(id) {
  remove('fuel_logs', r => r.id === id); persist()
}

// ─── Tareas por vehículo ───

export async function getVehicleTodos(carId) {
  return ok(
    db.vehicle_todos
      .filter(r => r.car_id === carId)
      .sort((a, b) => Number(a.completed) - Number(b.completed) || byDesc('created_at')(a, b))
  )
}

export async function createVehicleTodo(todo) {
  const row = {
    id: uid('t'), notes: '', priority: 'media', completed: false, completed_at: null,
    ...todo, created_at: now(),
  }
  db.vehicle_todos.push(row); persist()
  return ok(row)
}

export async function updateVehicleTodo(id, updates) {
  const row = db.vehicle_todos.find(r => r.id === id)
  if (!row) throw new Error('Tarea no encontrada')
  Object.assign(row, updates); persist()
  return ok(row)
}

export async function deleteVehicleTodo(id) {
  remove('vehicle_todos', r => r.id === id); persist()
}

// ─── Recordatorios ───

const withCar = (r) => ({ ...clone(r), cars: r.car_id ? carOf(r.car_id) : null })

export async function getReminders(userId) {
  return db.reminders
    .filter(r => r.user_id === userId)
    .sort((a, b) => Number(a.completed) - Number(b.completed) || byAsc('due_date')(a, b))
    .map(withCar)
}

export async function createReminder(reminder) {
  const row = {
    id: uid('r'), notes: '', completed: false, completed_at: null, car_id: null,
    ...reminder, created_at: now(),
  }
  db.reminders.push(row); persist()
  return withCar(row)
}

export async function updateReminder(id, updates) {
  const row = db.reminders.find(r => r.id === id)
  if (!row) throw new Error('Recordatorio no encontrado')
  Object.assign(row, updates); persist()
  return withCar(row)
}

export async function deleteReminder(id) {
  remove('reminders', r => r.id === id); persist()
}

// ─── Talleres ───

const withCreator = (w) => ({ ...clone(w), profiles: w.created_by ? profileOf(w.created_by) : null })

export async function getWorkshops() {
  return [...db.workshops].sort(byDesc('created_at')).map(withCreator)
}

export async function createWorkshop(ws) {
  const row = {
    id: uid('w'), phone: '', address: '', rating: 3, specialty: '', notes: '',
    ...ws, created_at: now(),
  }
  db.workshops.push(row); persist()
  return withCreator(row)
}

export async function updateWorkshop(id, updates) {
  const row = db.workshops.find(r => r.id === id)
  if (!row) throw new Error('Taller no encontrado')
  Object.assign(row, updates); persist()
  return withCreator(row)
}

export async function deleteWorkshop(id) {
  remove('workshops', r => r.id === id); persist()
}

// ─── Gastos ───

export async function getAllExpenses(carId) {
  const [maint, fuel] = await Promise.all([getMaintenanceRecords(carId), getFuelLogs(carId)])
  return { maint, fuel }
}

// ─── ITV ───

export async function getItvRecords(carId) {
  return ok(db.itv_records.filter(r => r.car_id === carId).sort(byDesc('inspection_date')))
}

export async function createItvRecord(record) {
  const row = {
    id: uid('i'), result: 'favorable', station: '', defects: '',
    resolved: false, cost: 0, notes: '', ...record, created_at: now(),
  }
  db.itv_records.push(row); persist()
  return ok(row)
}

export async function updateItvRecord(id, updates) {
  const row = db.itv_records.find(r => r.id === id)
  if (!row) throw new Error('ITV no encontrada')
  Object.assign(row, updates); persist()
  return ok(row)
}

export async function deleteItvRecord(id) {
  remove('itv_records', r => r.id === id); persist()
}

// ─── Grupos ───

const withGroupCreator = (g) => ({ ...clone(g), profiles: g.created_by ? profileOf(g.created_by) : null })

export async function getGroups(userId) {
  const ids = db.group_members.filter(m => m.user_id === userId).map(m => m.group_id)
  return db.groups
    .filter(g => ids.includes(g.id) && g.status === 'approved')
    .map(withGroupCreator)
}

export async function createGroup(name, createdBy) {
  const row = { id: uid('g'), name, created_by: createdBy, status: 'approved', created_at: now() }
  db.groups.push(row)
  db.group_members.push({ id: uid('gm'), group_id: row.id, user_id: createdBy, joined_at: now() })
  persist()
  return ok(row)
}

export async function requestGroup(name, createdBy) {
  const row = { id: uid('g'), name, created_by: createdBy, status: 'pending', created_at: now() }
  db.groups.push(row); persist()
  return ok(row)
}

export async function getPendingGroups() {
  return db.groups
    .filter(g => g.status === 'pending')
    .sort(byDesc('created_at'))
    .map(withGroupCreator)
}

export async function approveGroup(groupId, createdBy) {
  const g = db.groups.find(x => x.id === groupId)
  if (g) g.status = 'approved'
  const already = db.group_members.some(m => m.group_id === groupId && m.user_id === createdBy)
  if (!already) {
    db.group_members.push({ id: uid('gm'), group_id: groupId, user_id: createdBy, joined_at: now() })
  }
  persist()
}

export async function rejectGroup(groupId) {
  const g = db.groups.find(x => x.id === groupId)
  if (g) g.status = 'rejected'
  persist()
}

export async function deleteGroup(id) {
  remove('groups', g => g.id === id)
  remove('group_members', m => m.group_id === id)
  remove('group_messages', m => m.group_id === id)
  remove('group_invitations', i => i.group_id === id)
  persist()
}

export async function getGroupMembers(groupId) {
  return db.group_members
    .filter(m => m.group_id === groupId)
    .map(m => ({ ...clone(m), profiles: profileOf(m.user_id) }))
}

export async function addGroupMember(groupId, userId) {
  const existing = db.group_members.find(m => m.group_id === groupId && m.user_id === userId)
  if (existing) return ok(existing)
  const row = { id: uid('gm'), group_id: groupId, user_id: userId, joined_at: now() }
  db.group_members.push(row); persist()
  return ok(row)
}

export async function removeGroupMember(groupId, userId) {
  remove('group_members', m => m.group_id === groupId && m.user_id === userId)
  persist()
}

// ─── Invitaciones ───

export async function inviteToGroup(groupId, userId, invitedBy) {
  const existing = db.group_invitations.find(i => i.group_id === groupId && i.user_id === userId)
  if (existing) {
    Object.assign(existing, { status: 'pending', invited_by: invitedBy, created_at: now() })
    persist()
    return ok(existing)
  }
  const row = { id: uid('gi'), group_id: groupId, user_id: userId, invited_by: invitedBy, status: 'pending', created_at: now() }
  db.group_invitations.push(row); persist()
  return ok(row)
}

export async function getMyInvitations(userId) {
  return db.group_invitations
    .filter(i => i.user_id === userId && i.status === 'pending')
    .sort(byDesc('created_at'))
    .map(i => {
      const g = db.groups.find(x => x.id === i.group_id)
      return {
        ...clone(i),
        groups: g ? { id: g.id, name: g.name, created_by: g.created_by, profiles: profileOf(g.created_by) } : null,
        inviter: i.invited_by ? profileOf(i.invited_by) : null,
      }
    })
}

export async function getGroupInvitations(groupId) {
  return db.group_invitations
    .filter(i => i.group_id === groupId && i.status === 'pending')
    .map(i => ({ ...clone(i), profiles: profileOf(i.user_id) }))
}

export async function acceptInvitation(invitationId, groupId, userId) {
  const inv = db.group_invitations.find(i => i.id === invitationId)
  if (inv) inv.status = 'accepted'
  await addGroupMember(groupId, userId)
  persist()
}

export async function rejectInvitation(invitationId) {
  const inv = db.group_invitations.find(i => i.id === invitationId)
  if (inv) inv.status = 'rejected'
  persist()
}

// ─── Mensajes de grupo ───

const withAuthor = (m) => ({ ...clone(m), profiles: profileOf(m.user_id) })

export async function getGroupMessages(groupId) {
  return db.group_messages
    .filter(m => m.group_id === groupId)
    .sort(byAsc('created_at'))
    .slice(-200)
    .map(withAuthor)
}

export async function sendGroupMessage(groupId, userId, message) {
  const row = { id: uid('gx'), group_id: groupId, user_id: userId, message, created_at: now() }
  db.group_messages.push(row); persist()
  return withAuthor(row)
}

export async function getMemberCars(userId) {
  return ok(db.cars.filter(c => c.user_id === userId).sort(byAsc('created_at')))
}
