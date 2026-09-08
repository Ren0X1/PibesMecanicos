import { describe, it, expect, beforeEach } from 'vitest'
import * as real from '../src/lib/supabase.js'
import * as demo from '../src/lib/demo/store.js'
import { getMaintStatus } from '../src/lib/constants.js'

/* La demo tiene que ofrecer EXACTAMENTE la misma API que la real.
   Si alguien añade una función a supabase.js y se olvida de la demo,
   /demo revienta con «no es una función» al abrir esa pantalla. */

const fnNames = (mod) =>
  Object.entries(mod)
    .filter(([, v]) => typeof v === 'function')
    .map(([k]) => k)
    .sort()

describe('paridad de la API', () => {
  it('la demo implementa todo lo que implementa la real', () => {
    const missing = fnNames(real).filter(n => typeof demo[n] !== 'function')
    expect(missing).toEqual([])
  })

  it('todas las funciones de datos devuelven promesas', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    expect(Array.isArray(cars)).toBe(true)
  })
})

describe('datos de ejemplo', () => {
  beforeEach(() => demo.resetDemo())

  it('el usuario de la demo existe y es administrador', () => {
    const u = demo.getDemoUser()
    expect(u).toBeTruthy()
    expect(u.role).toBe('admin')
  })

  it('llega sin contestar el asistente, para que se vea al entrar', () => {
    expect(demo.getDemoUser().onboarded_at).toBeNull()
  })

  it('trae dos vehículos propios', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    expect(cars).toHaveLength(2)
  })

  it('uno de los vehículos tiene mantenimientos vencidos y otro no', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const estados = []
    for (const car of cars) {
      const maint = await demo.getMaintenanceRecords(car.id)
      estados.push(maint.some(m => getMaintStatus(m, car.current_km) === 'overdue'))
    }
    expect(estados).toContain(true)
    expect(estados).toContain(false)
  })

  it('las fechas son relativas: la ITV del BMW aún no ha caducado', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const bmw = cars.find(c => c.brand === 'BMW')
    const [itv] = await demo.getItvRecords(bmw.id)
    expect(new Date(itv.expiry_date).getTime()).toBeGreaterThan(Date.now())
  })
})

describe('joins', () => {
  beforeEach(() => demo.resetDemo())

  it('los recordatorios traen el vehículo asociado', async () => {
    const rem = await demo.getReminders(demo.DEMO_USER_ID)
    const conCoche = rem.find(r => r.car_id)
    expect(conCoche.cars).toBeTruthy()
    expect(conCoche.cars.brand).toBeTruthy()
  })

  it('los mensajes de grupo traen el autor', async () => {
    const [group] = await demo.getGroups(demo.DEMO_USER_ID)
    const msgs = await demo.getGroupMessages(group.id)
    expect(msgs[0].profiles.name).toBeTruthy()
  })

  it('las invitaciones traen el grupo y quién invita', async () => {
    const inv = await demo.getMyInvitations(demo.DEMO_USER_ID)
    expect(inv[0].groups.name).toBeTruthy()
    expect(inv[0].inviter.name).toBeTruthy()
  })

  it('los talleres traen quién los añadió', async () => {
    const ws = await demo.getWorkshops()
    expect(ws.some(w => w.profiles?.name)).toBe(true)
  })
})

describe('escritura', () => {
  beforeEach(() => demo.resetDemo())

  it('crea, actualiza y borra un vehículo', async () => {
    const antes = (await demo.getCars(demo.DEMO_USER_ID)).length
    const nuevo = await demo.createCar({
      user_id: demo.DEMO_USER_ID, plate: '0000 AAA',
      brand: 'Test', model: 'X', year: 2020, current_km: 10,
    })
    expect((await demo.getCars(demo.DEMO_USER_ID)).length).toBe(antes + 1)

    await demo.updateCar(nuevo.id, { current_km: 500 })
    const actualizado = (await demo.getCars(demo.DEMO_USER_ID)).find(c => c.id === nuevo.id)
    expect(actualizado.current_km).toBe(500)

    await demo.deleteCar(nuevo.id)
    expect((await demo.getCars(demo.DEMO_USER_ID)).length).toBe(antes)
  })

  it('al borrar un vehículo se lleva por delante sus datos', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const bmw = cars.find(c => c.brand === 'BMW')
    expect((await demo.getMaintenanceRecords(bmw.id)).length).toBeGreaterThan(0)

    await demo.deleteCar(bmw.id)
    expect(await demo.getMaintenanceRecords(bmw.id)).toEqual([])
    expect(await demo.getFuelLogs(bmw.id)).toEqual([])
    expect(await demo.getItvRecords(bmw.id)).toEqual([])
    expect(await demo.getVehicleTodos(bmw.id)).toEqual([])
  })

  it('el upsert de mantenimiento actualiza en vez de duplicar', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const car = cars[0]
    const antes = (await demo.getMaintenanceRecords(car.id)).length
    await demo.upsertMaintenanceRecord({
      car_id: car.id, type_id: 'aceite', last_km: 1, next_km: 2, cost: 9, notes: 'x',
    })
    const despues = await demo.getMaintenanceRecords(car.id)
    expect(despues.length).toBe(antes)
    expect(despues.find(m => m.type_id === 'aceite').cost).toBe(9)
  })

  it('no deja crear dos usuarios con el mismo nombre', async () => {
    await expect(demo.createProfile({ name: 'X', username: 'alejandro', pin: '1' }))
      .rejects.toThrow()
  })

  it('el acceso comprueba usuario y PIN', async () => {
    await expect(demo.login('alejandro', '0000')).resolves.toBeTruthy()
    await expect(demo.login('alejandro', '9999')).rejects.toThrow()
    await expect(demo.login('nadie', '0000')).rejects.toThrow()
  })
})

describe('reinicio', () => {
  it('deshace los cambios y limpia el estado que vive aparte', async () => {
    await demo.createCar({
      user_id: demo.DEMO_USER_ID, plate: 'Z', brand: 'Z', model: 'Z', year: 2020, current_km: 0,
    })
    localStorage.setItem(`pm_snoozed_v1_${demo.DEMO_USER_ID}`, '{"x":1}')
    localStorage.setItem(`pm_onboarded_${demo.DEMO_USER_ID}`, '1')
    localStorage.setItem('pm_swipe_hint_v1', '1')

    demo.resetDemo()

    expect((await demo.getCars(demo.DEMO_USER_ID)).length).toBe(2)
    expect(localStorage.getItem(`pm_snoozed_v1_${demo.DEMO_USER_ID}`)).toBeNull()
    expect(localStorage.getItem(`pm_onboarded_${demo.DEMO_USER_ID}`)).toBeNull()
    expect(localStorage.getItem('pm_swipe_hint_v1')).toBeNull()
  })
})
