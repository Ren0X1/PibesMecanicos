import { createClient } from '@supabase/supabase-js'
import { t } from './i18n.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey)

/* Sin claves NO se revienta al importar: la demo (/demo) no toca
   Supabase y tiene que poder arrancar en un clon recién bajado.
   El error solo salta si alguien intenta usar la base de verdad. */
function missingConfig() {
  throw new Error(
    'Faltan las variables de entorno de Supabase. Crea un .env con ' +
    'VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY, o entra en /demo.'
  )
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey)
  : new Proxy({}, { get: () => missingConfig })

// ─── Profiles ───

export async function login(username, pin) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username.trim())
    .eq('pin', pin)
    .single()
  if (error || !data) throw new Error(t('login.errCreds'))
  return data
}

export async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data
}

export async function createProfile({ name, username, pin, role = 'user' }) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ name, username: username.toLowerCase().trim(), pin, role })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(id, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProfile(id) {
  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) throw error
}

// ─── Cars ───

export async function getCars(userId) {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function createCar(car) {
  const { data, error } = await supabase
    .from('cars')
    .insert(car)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCar(id, updates) {
  const { data, error } = await supabase
    .from('cars')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCar(id) {
  const { error } = await supabase.from('cars').delete().eq('id', id)
  if (error) throw error
}

// ─── KM Logs ───

export async function getKmLogs(carId) {
  const { data, error } = await supabase
    .from('km_logs')
    .select('*')
    .eq('car_id', carId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function createKmLog(log) {
  const { data, error } = await supabase
    .from('km_logs')
    .insert(log)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteKmLog(id) {
  const { error } = await supabase.from('km_logs').delete().eq('id', id)
  if (error) throw error
}

// ─── Maintenance Records ───

export async function getMaintenanceRecords(carId) {
  const { data, error } = await supabase
    .from('maintenance_records')
    .select('*')
    .eq('car_id', carId)
  if (error) throw error
  return data
}

/* Una fecha vacía es NULL, no ''. Postgres rechaza la cadena vacía
   en una columna DATE, y del formulario puede llegar así cuando el
   usuario no la rellena. */
const fecha = (v) => (v === '' || v === undefined ? null : v)
const numero = (v) => (v === '' || v === undefined ? null : v)

export async function upsertMaintenanceRecord(record) {
  const campos = {
    last_km: record.last_km, last_date: fecha(record.last_date),
    next_km: record.next_km, next_date: fecha(record.next_date),
    cost: record.cost, notes: record.notes,
    workshop_id: record.workshop_id ?? null,
    part_id: record.part_id ?? null,
    // Los dos lados del eje. En moto se quedan a NULL.
    last_km_izq: numero(record.last_km_izq), last_date_izq: fecha(record.last_date_izq),
    last_km_der: numero(record.last_km_der), last_date_der: fecha(record.last_date_der),
  }

  const { data: existing } = await supabase
    .from('maintenance_records')
    .select('id')
    .eq('car_id', record.car_id)
    .eq('type_id', record.type_id)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('maintenance_records')
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('maintenance_records')
      .insert({ car_id: record.car_id, type_id: record.type_id, ...campos })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function deleteMaintenanceRecord(carId, typeId) {
  const { error } = await supabase
    .from('maintenance_records')
    .delete()
    .eq('car_id', carId)
    .eq('type_id', typeId)
  if (error) throw error
}

// ─── Car Parts (Recambios) ───

export async function getCarParts(carId) {
  const { data, error } = await supabase
    .from('car_parts')
    .select('*')
    .eq('car_id', carId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function createCarPart(part) {
  const { data, error } = await supabase
    .from('car_parts')
    .insert(part)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCarPart(id) {
  const { error } = await supabase.from('car_parts').delete().eq('id', id)
  if (error) throw error
}

// ─── Ajustes de la aplicación · modo mantenimiento ───

/* Un interruptor que apaga la web para todo el mundo menos para los
   administradores. Si la tabla todavía no existe —la migración 17
   sin aplicar— se devuelve apagado en vez de reventar: una web
   caída por no poder preguntar si está caída sería un chiste. */

export async function getMaintenanceMode() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'maintenance')
      .maybeSingle()
    if (error) throw error
    const v = data?.value || {}
    return {
      on: Boolean(v.on),
      message: v.message || '',
      updated_at: data?.updated_at || null,
      updated_by: data?.updated_by || null,
    }
  } catch {
    return { on: false, message: '', updated_at: null, updated_by: null }
  }
}

export async function setMaintenanceMode({ on, message = '', userId = null }) {
  const { data, error } = await supabase
    .from('app_settings')
    .upsert({
      key: 'maintenance',
      value: { on: Boolean(on), message },
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }, { onConflict: 'key' })
    .select()
    .single()
  if (error) throw error
  return { on: Boolean(data.value?.on), message: data.value?.message || '', updated_at: data.updated_at, updated_by: data.updated_by }
}

/* Mantener la base despierta.

   Un proyecto de Supabase que no recibe una sola consulta se pausa
   solo. La tarea de GitHub Actions entra cada seis horas, mira este
   interruptor y, si está puesto, hace un SELECT y apunta el toque
   en la fila de al lado. Aquí solo se lee y se enciende o apaga. */

export async function getKeepAlive() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .in('key', ['keepalive', 'keepalive_ping'])
    if (error) throw error
    const fila = (k) => (data || []).find(r => r.key === k)
    const ajuste = fila('keepalive')?.value || {}
    const toque = fila('keepalive_ping')?.value || {}
    return {
      on: Boolean(ajuste.on),
      everyHours: Number(ajuste.every_hours) || 6,
      lastPingAt: toque.at || null,
      source: toque.source || '',
    }
  } catch {
    return { on: false, everyHours: 6, lastPingAt: null, source: '' }
  }
}

export async function setKeepAlive({ on, everyHours = 6, userId = null }) {
  const { data, error } = await supabase
    .from('app_settings')
    .upsert({
      key: 'keepalive',
      value: { on: Boolean(on), every_hours: everyHours },
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }, { onConflict: 'key' })
    .select()
    .single()
  if (error) throw error
  const toque = await getKeepAlive()
  return { ...toque, on: Boolean(data.value?.on) }
}

// ─── Custom Jobs (Trabajos libres) ───

/* Lo que no está en la lista de mantenimientos: una rótula, una
   soldadura, un pulido. Aquí sí hay varias entradas por vehículo y
   no hay «próximo»: es un cuaderno, no un aviso. */

export async function getCustomJobs(carId) {
  const { data, error } = await supabase
    .from('custom_jobs')
    .select('*')
    .eq('car_id', carId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function createCustomJob(job) {
  const { data, error } = await supabase
    .from('custom_jobs')
    .insert({
      ...job,
      date: fecha(job.date),
      workshop_id: job.workshop_id ?? null,
      part_id: job.part_id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCustomJob(id, updates) {
  const campos = { ...updates, updated_at: new Date().toISOString() }
  // Solo se toca la fecha si venía en la actualización: la columna es
  // obligatoria y ponerla a NULL sin querer daría error.
  if ('date' in updates) campos.date = fecha(updates.date) ?? undefined
  const { data, error } = await supabase
    .from('custom_jobs')
    .update(campos)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCustomJob(id) {
  const { error } = await supabase.from('custom_jobs').delete().eq('id', id)
  if (error) throw error
}

// ─── Fuel Logs (Repostajes) ───

export async function getFuelLogs(carId) {
  const { data, error } = await supabase
    .from('fuel_logs')
    .select('*')
    .eq('car_id', carId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function createFuelLog(log) {
  const { data, error } = await supabase
    .from('fuel_logs')
    .insert(log)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFuelLog(id) {
  const { error } = await supabase.from('fuel_logs').delete().eq('id', id)
  if (error) throw error
}

// ─── Vehicle Todos ───

export async function getVehicleTodos(carId) {
  const { data, error } = await supabase
    .from('vehicle_todos')
    .select('*')
    .eq('car_id', carId)
    .order('completed')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createVehicleTodo(todo) {
  const { data, error } = await supabase
    .from('vehicle_todos')
    .insert(todo)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateVehicleTodo(id, updates) {
  const { data, error } = await supabase
    .from('vehicle_todos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVehicleTodo(id) {
  const { error } = await supabase.from('vehicle_todos').delete().eq('id', id)
  if (error) throw error
}

// ─── Reminders (personal user reminders) ───

export async function getReminders(userId) {
  const { data, error } = await supabase
    .from('reminders')
    .select('*, cars(brand, model, plate, vehicle_type)')
    .eq('user_id', userId)
    .order('completed')
    .order('due_date')
  if (error) throw error
  return data
}

export async function createReminder(reminder) {
  const { data, error } = await supabase
    .from('reminders')
    .insert(reminder)
    .select('*, cars(brand, model, plate, vehicle_type)')
    .single()
  if (error) throw error
  return data
}

export async function updateReminder(id, updates) {
  const { data, error } = await supabase
    .from('reminders')
    .update(updates)
    .eq('id', id)
    .select('*, cars(brand, model, plate, vehicle_type)')
    .single()
  if (error) throw error
  return data
}

export async function deleteReminder(id) {
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  if (error) throw error
}

// ─── Workshops (Talleres) ───

export async function getWorkshops() {
  const { data, error } = await supabase
    .from('workshops')
    .select('*, profiles(name)')
    .order('rating', { ascending: false })
  if (error) throw error
  return data
}

export async function createWorkshop(ws) {
  const { data, error } = await supabase
    .from('workshops')
    .insert(ws)
    .select('*, profiles(name)')
    .single()
  if (error) throw error
  return data
}

export async function deleteWorkshop(id) {
  const { error } = await supabase.from('workshops').delete().eq('id', id)
  if (error) throw error
}

export async function updateWorkshop(id, updates) {
  const { data, error } = await supabase
    .from('workshops')
    .update(updates)
    .eq('id', id)
    .select('*, profiles(name)')
    .single()
  if (error) throw error
  return data
}

// ─── Expense helpers ───

export async function getAllExpenses(carId) {
  const [maint, fuel, jobs] = await Promise.all([
    getMaintenanceRecords(carId),
    getFuelLogs(carId),
    getCustomJobs(carId),
  ])
  return { maint, fuel, jobs }
}

// ─── ITV Records ───

export async function getItvRecords(carId) {
  const { data, error } = await supabase
    .from('itv_records')
    .select('*')
    .eq('car_id', carId)
    .order('inspection_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createItvRecord(record) {
  const { data, error } = await supabase
    .from('itv_records')
    .insert(record)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateItvRecord(id, updates) {
  const { data, error } = await supabase
    .from('itv_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteItvRecord(id) {
  const { error } = await supabase.from('itv_records').delete().eq('id', id)
  if (error) throw error
}

// ─── Groups ───

// Approved groups where the user is a member
export async function getGroups(userId) {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, created_by, created_at, status, profiles(name))')
    .eq('user_id', userId)
  if (error) throw error
  return data
    .map(gm => gm.groups)
    .filter(g => g && g.status === 'approved')
}

// Site-admin creates a group directly (already approved)
export async function createGroup(name, createdBy) {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, created_by: createdBy, status: 'approved' })
    .select()
    .single()
  if (error) throw error
  await supabase.from('group_members').insert({ group_id: data.id, user_id: createdBy })
  return data
}

// Normal user requests a group (pending approval)
export async function requestGroup(name, createdBy) {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, created_by: createdBy, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

// Site admin: list pending group requests
export async function getPendingGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*, profiles(name, username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Site admin: approve a group → the requester becomes member + group admin
export async function approveGroup(groupId, createdBy) {
  const { error } = await supabase
    .from('groups')
    .update({ status: 'approved' })
    .eq('id', groupId)
  if (error) throw error
  // Add creator as first member (ignore if already there)
  await supabase.from('group_members').insert({ group_id: groupId, user_id: createdBy }).select()
}

// Site admin: reject a group request
export async function rejectGroup(groupId) {
  const { error } = await supabase.from('groups').delete().eq('id', groupId)
  if (error) throw error
}

export async function deleteGroup(id) {
  const { error } = await supabase.from('groups').delete().eq('id', id)
  if (error) throw error
}

export async function getGroupMembers(groupId) {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, profiles(id, name, username)')
    .eq('group_id', groupId)
  if (error) throw error
  return data
}

export async function addGroupMember(groupId, userId) {
  const { data, error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeGroupMember(groupId, userId) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
  if (error) throw error
}

// ─── Group invitations ───

// Group admin invites a user
export async function inviteToGroup(groupId, userId, invitedBy) {
  // Upsert: if a previous rejected invite exists, reset it to pending
  const { data: existing } = await supabase
    .from('group_invitations')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()
  if (existing) {
    const { data, error } = await supabase
      .from('group_invitations')
      .update({ status: 'pending', invited_by: invitedBy, created_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('group_invitations')
    .insert({ group_id: groupId, user_id: userId, invited_by: invitedBy, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

// Pending invitations for a user (to show "you've been invited")
export async function getMyInvitations(userId) {
  const { data, error } = await supabase
    .from('group_invitations')
    .select('*, groups(id, name, created_by, profiles(name)), inviter:invited_by(name)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Pending invitations for a group (so the admin sees who has a pending invite)
export async function getGroupInvitations(groupId) {
  const { data, error } = await supabase
    .from('group_invitations')
    .select('*, profiles:user_id(id, name, username)')
    .eq('group_id', groupId)
    .eq('status', 'pending')
  if (error) throw error
  return data
}

export async function acceptInvitation(invitationId, groupId, userId) {
  const { error } = await supabase
    .from('group_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId)
  if (error) throw error
  await supabase.from('group_members').insert({ group_id: groupId, user_id: userId }).select()
}

export async function rejectInvitation(invitationId) {
  const { error } = await supabase
    .from('group_invitations')
    .update({ status: 'rejected' })
    .eq('id', invitationId)
  if (error) throw error
}

export async function getGroupMessages(groupId) {
  const { data, error } = await supabase
    .from('group_messages')
    .select('*, profiles(name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) throw error
  return data
}

export async function sendGroupMessage(groupId, userId, message) {
  const { data, error } = await supabase
    .from('group_messages')
    .insert({ group_id: groupId, user_id: userId, message })
    .select('*, profiles(name)')
    .single()
  if (error) throw error
  return data
}

export async function getMemberCars(userId) {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return data
}
