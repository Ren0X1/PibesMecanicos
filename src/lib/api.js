/* ─────────────────────────────────────────────────────────────
   Fachada de datos

   Los componentes importan SIEMPRE de aquí, nunca de supabase.js
   directamente. Según la ruta, cada llamada se dirige a la base
   de datos real o al almacén de la demo.

   La decisión se toma en el momento de la llamada, no al importar,
   para que entrar y salir de /demo funcione sin recargar la página.

   Este fichero está generado a partir de los exports de
   supabase.js: si añades una función allí, añádela también en
   demo/store.js y en la lista de abajo.
   ───────────────────────────────────────────────────────────── */

import * as real from './supabase.js'
import * as demo from './demo/store.js'
import { isDemo } from './demo/mode.js'

export { isDemo } from './demo/mode.js'
export { resetDemo, getDemoUser, DEMO_USER_ID } from './demo/store.js'
export { hasSupabaseConfig } from './supabase.js'

const impl = () => (isDemo() ? demo : real)

export const login = (...a) => impl().login(...a)
export const getProfiles = (...a) => impl().getProfiles(...a)
export const createProfile = (...a) => impl().createProfile(...a)
export const updateProfile = (...a) => impl().updateProfile(...a)
export const deleteProfile = (...a) => impl().deleteProfile(...a)
export const getCars = (...a) => impl().getCars(...a)
export const createCar = (...a) => impl().createCar(...a)
export const updateCar = (...a) => impl().updateCar(...a)
export const deleteCar = (...a) => impl().deleteCar(...a)
export const getKmLogs = (...a) => impl().getKmLogs(...a)
export const createKmLog = (...a) => impl().createKmLog(...a)
export const deleteKmLog = (...a) => impl().deleteKmLog(...a)
export const getMaintenanceRecords = (...a) => impl().getMaintenanceRecords(...a)
export const upsertMaintenanceRecord = (...a) => impl().upsertMaintenanceRecord(...a)
export const deleteMaintenanceRecord = (...a) => impl().deleteMaintenanceRecord(...a)
export const getCarParts = (...a) => impl().getCarParts(...a)
export const createCarPart = (...a) => impl().createCarPart(...a)
export const deleteCarPart = (...a) => impl().deleteCarPart(...a)
export const getFuelLogs = (...a) => impl().getFuelLogs(...a)
export const createFuelLog = (...a) => impl().createFuelLog(...a)
export const deleteFuelLog = (...a) => impl().deleteFuelLog(...a)
export const getVehicleTodos = (...a) => impl().getVehicleTodos(...a)
export const createVehicleTodo = (...a) => impl().createVehicleTodo(...a)
export const updateVehicleTodo = (...a) => impl().updateVehicleTodo(...a)
export const deleteVehicleTodo = (...a) => impl().deleteVehicleTodo(...a)
export const getReminders = (...a) => impl().getReminders(...a)
export const createReminder = (...a) => impl().createReminder(...a)
export const updateReminder = (...a) => impl().updateReminder(...a)
export const deleteReminder = (...a) => impl().deleteReminder(...a)
export const getWorkshops = (...a) => impl().getWorkshops(...a)
export const createWorkshop = (...a) => impl().createWorkshop(...a)
export const deleteWorkshop = (...a) => impl().deleteWorkshop(...a)
export const updateWorkshop = (...a) => impl().updateWorkshop(...a)
export const getAllExpenses = (...a) => impl().getAllExpenses(...a)
export const getItvRecords = (...a) => impl().getItvRecords(...a)
export const createItvRecord = (...a) => impl().createItvRecord(...a)
export const updateItvRecord = (...a) => impl().updateItvRecord(...a)
export const deleteItvRecord = (...a) => impl().deleteItvRecord(...a)
export const getGroups = (...a) => impl().getGroups(...a)
export const createGroup = (...a) => impl().createGroup(...a)
export const requestGroup = (...a) => impl().requestGroup(...a)
export const getPendingGroups = (...a) => impl().getPendingGroups(...a)
export const approveGroup = (...a) => impl().approveGroup(...a)
export const rejectGroup = (...a) => impl().rejectGroup(...a)
export const deleteGroup = (...a) => impl().deleteGroup(...a)
export const getGroupMembers = (...a) => impl().getGroupMembers(...a)
export const addGroupMember = (...a) => impl().addGroupMember(...a)
export const removeGroupMember = (...a) => impl().removeGroupMember(...a)
export const inviteToGroup = (...a) => impl().inviteToGroup(...a)
export const getMyInvitations = (...a) => impl().getMyInvitations(...a)
export const getGroupInvitations = (...a) => impl().getGroupInvitations(...a)
export const acceptInvitation = (...a) => impl().acceptInvitation(...a)
export const rejectInvitation = (...a) => impl().rejectInvitation(...a)
export const getGroupMessages = (...a) => impl().getGroupMessages(...a)
export const sendGroupMessage = (...a) => impl().sendGroupMessage(...a)
export const getMemberCars = (...a) => impl().getMemberCars(...a)
