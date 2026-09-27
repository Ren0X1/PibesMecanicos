import { describe, it, expect, beforeEach } from 'vitest'
import {
  MAINT_TYPES, getMaintenanceForVehicle, getMaintStatus,
  maintName, maintDefKm, maintDefMonths, hasSides, hasSideData,
  worstOf, worstSide, maintLabel, nextFrom, sideLabel, sideShort, SIDES,
} from '../src/lib/constants.js'
import * as demo from '../src/lib/demo/store.js'
import { setLang } from '../src/lib/i18n.js'

/* ─────────────────────────────────────────────────────────────
   Las piezas que van por eje

   Lo que hay que defender aquí es la regla del medio: el aviso lo
   manda el lado que peor está. Si cambias el neumático izquierdo y
   el derecho sigue siendo el de hace cuatro años, la ficha no puede
   ponerse verde.
   ───────────────────────────────────────────────────────────── */

const tipo = (id) => MAINT_TYPES.find(m => m.id === id)

beforeEach(() => setLang('es'))

describe('los tipos por eje', () => {
  it('neumáticos, discos y amortiguadores van partidos en dos ejes', () => {
    for (const base of ['neumaticos', 'discos', 'amortiguadores']) {
      expect(tipo(`${base}_del`)).toBeTruthy()
      expect(tipo(`${base}_tras`)).toBeTruthy()
    }
  })

  it('ya no existen los tipos de antes, que eran la pieza entera', () => {
    for (const viejo of ['neumaticos', 'discos_freno', 'amortiguadores']) {
      expect(tipo(viejo)).toBeUndefined()
    }
  })

  it('los ejes se declaran con su lado del coche', () => {
    expect(tipo('neumaticos_del').axle).toBe('del')
    expect(tipo('neumaticos_tras').axle).toBe('tras')
  })

  it('silentblocks solo en coche y rodamientos solo en moto', () => {
    const coche = getMaintenanceForVehicle('coche', 'Gasolina').map(m => m.id)
    const moto = getMaintenanceForVehicle('moto', 'Gasolina').map(m => m.id)
    expect(coche).toContain('silentblocks_del')
    expect(coche).not.toContain('rodamientos')
    expect(moto).toContain('rodamientos')
    expect(moto).not.toContain('silentblocks_del')
  })
})

describe('una moto no tiene izquierdo y derecho', () => {
  it('los lados solo salen en coche', () => {
    expect(hasSides(tipo('neumaticos_del'), 'coche')).toBe(true)
    expect(hasSides(tipo('neumaticos_del'), 'moto')).toBe(false)
  })

  it('lo que no va por eje no tiene lados ni en coche', () => {
    expect(hasSides(tipo('aceite'), 'coche')).toBe(false)
  })

  it('en moto el nombre va en singular', () => {
    expect(maintName(tipo('neumaticos_del'), 'coche')).toBe('Neumáticos del.')
    expect(maintName(tipo('neumaticos_del'), 'moto')).toBe('Neumático del.')
  })

  it('en moto lo de delante es la horquilla', () => {
    setLang('en')
    expect(maintName(tipo('amortiguadores_del'), 'moto')).toBe('Front fork')
    expect(maintName(tipo('amortiguadores_del'), 'coche')).toBe('Front shock absorbers')
  })

  it('el intervalo de la moto no es el del coche', () => {
    expect(maintDefKm(tipo('neumaticos_tras'), 'coche')).toBe(45000)
    expect(maintDefKm(tipo('neumaticos_tras'), 'moto')).toBe(12000)
    // Los meses, mientras no se digan aparte, son los mismos.
    expect(maintDefMonths(tipo('neumaticos_tras'), 'moto')).toBe(60)
  })
})

describe('el lado que manda', () => {
  const eje = (izq, der) => ({
    last_km_izq: izq?.[0] ?? null, last_date_izq: izq?.[1] ?? null,
    last_km_der: der?.[0] ?? null, last_date_der: der?.[1] ?? null,
  })

  it('es el que lleva más kilómetros sin cambiarse', () => {
    expect(worstSide(eje([186000, '2026-08-18'], [158000, '2026-01-10']))).toBe('der')
    expect(worstSide(eje([120000, '2024-01-01'], [180000, '2026-01-01']))).toBe('izq')
  })

  it('un lado sin datos es el peor: no consta que se haya tocado', () => {
    expect(worstSide(eje([186000, '2026-08-18'], null))).toBe('der')
    expect(worstSide(eje(null, [158000, '2026-01-10']))).toBe('izq')
  })

  it('con los dos iguales no hay uno peor que otro', () => {
    expect(worstSide(eje([158000, '2026-01-10'], [158000, '2026-01-10']))).toBeNull()
  })

  it('a igualdad de kilómetros decide la fecha más vieja', () => {
    expect(worstSide(eje([158000, '2026-05-01'], [158000, '2023-01-10']))).toBe('der')
  })

  it('sin lados apuntados no hay lado que mande', () => {
    expect(worstSide(eje(null, null))).toBeNull()
    expect(worstSide(null)).toBeNull()
    expect(hasSideData(eje(null, null))).toBe(false)
    expect(hasSideData(eje([1, '2026-01-01'], null))).toBe(true)
  })

  it('worstOf devuelve el par más atrasado y se salta los vacíos', () => {
    expect(worstOf([{ km: 100, date: 'a' }, { km: 50, date: 'b' }])).toEqual({ km: 50, date: 'b' })
    expect(worstOf([null, { km: 50, date: 'b' }])).toEqual({ km: 50, date: 'b' })
    expect(worstOf([null, null])).toBeNull()
    expect(worstOf([])).toBeNull()
  })
})

describe('cambiar un solo lado no borra el aviso', () => {
  /* El caso que motivó todo esto: se pincha el izquierdo, se cambia
     ese, y el derecho sigue siendo el viejo. El próximo tiene que
     seguir saliendo del derecho. */
  it('el próximo se calcula desde el lado viejo', () => {
    const mt = tipo('neumaticos_del')
    const der = { km: 158000, date: '2023-01-10' }
    const izq = { km: 186000, date: '2026-08-18' }
    const peor = worstOf([izq, der])
    expect(peor).toEqual(der)

    const siguiente = nextFrom(peor.km, peor.date, mt, 'coche')
    expect(siguiente.next_km).toBe(158000 + 45000)
    expect(siguiente.next_date).toBe('2028-01-10')   // 60 meses después
  })

  it('cambiando los dos, el próximo sale del cambio', () => {
    const mt = tipo('neumaticos_del')
    const par = { km: 190000, date: '2026-09-01' }
    const peor = worstOf([par, par])
    const siguiente = nextFrom(peor.km, peor.date, mt, 'coche')
    expect(siguiente.next_km).toBe(235000)
  })

  it('sin intervalo de km el próximo se queda en cero', () => {
    const siguiente = nextFrom(170000, '2026-04-30', tipo('silentblocks_del'), 'coche')
    expect(siguiente.next_km).toBe(0)
    expect(siguiente.next_date).toBe('')
  })
})

describe('el estado de lo que no se mide en kilómetros', () => {
  /* Antes, un próximo en cero significaba «vencido hace doscientos
     mil kilómetros» y los silentblocks nacían en rojo. */
  it('sin próximo previsto no hay nada que vencer', () => {
    expect(getMaintStatus({ next_km: 0, next_date: '' }, 187000)).toBe('ok')
  })

  it('con fecha, la fecha sigue mandando aunque no haya kilómetros', () => {
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    expect(getMaintStatus({ next_km: 0, next_date: ayer }, 187000)).toBe('overdue')
  })

  it('con kilómetros se comporta como siempre', () => {
    expect(getMaintStatus({ next_km: 100000, next_date: '' }, 100001)).toBe('overdue')
    expect(getMaintStatus({ next_km: 100000, next_date: '' }, 50000)).toBe('ok')
  })
})

describe('cómo se dice un eje con lado', () => {
  it('el aviso dice cuál de los dos manda', () => {
    setLang('es')
    const m = { last_km_izq: 186000, last_date_izq: '2026-08-18', last_km_der: 158000, last_date_der: '2026-01-10' }
    expect(maintLabel(tipo('neumaticos_del'), m, 'coche')).toBe('Neumáticos del. — Derecho')
  })

  it('si los dos están igual, no se nombra ningún lado', () => {
    const m = { last_km_izq: 158000, last_date_izq: '2026-01-10', last_km_der: 158000, last_date_der: '2026-01-10' }
    expect(maintLabel(tipo('neumaticos_del'), m, 'coche')).toBe('Neumáticos del.')
  })

  it('en moto nunca se nombra un lado', () => {
    const m = { last_km_izq: 186000, last_date_izq: '2026-08-18', last_km_der: null, last_date_der: null }
    expect(maintLabel(tipo('neumaticos_del'), m, 'moto')).toBe('Neumático del.')
  })

  it('las abreviaturas no son la palabra cortada', () => {
    setLang('en')
    expect(sideLabel('izq')).toBe('Left')
    expect(sideShort('izq')).toBe('LH')
    expect(sideShort('der')).toBe('RH')
    setLang('es')
    expect(sideShort('izq')).toBe('IZQ')
    for (const lado of SIDES) {
      expect(sideShort(lado).length).toBeLessThanOrEqual(3)
    }
  })
})

describe('la demo trae los ejes puestos', () => {
  beforeEach(() => demo.resetDemo())

  it('el coche tiene un eje con un lado nuevo y otro viejo', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const bmw = cars.find(c => c.brand === 'BMW')
    const maint = await demo.getMaintenanceRecords(bmw.id)
    const delantero = maint.find(m => m.type_id === 'neumaticos_del')
    expect(delantero).toBeTruthy()
    expect(delantero.last_km_izq).not.toBe(delantero.last_km_der)
    expect(worstSide(delantero)).toBe('der')
  })

  it('la moto no trae lados', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const moto = cars.find(c => c.vehicle_type === 'moto')
    const maint = await demo.getMaintenanceRecords(moto.id)
    for (const m of maint) {
      expect(m.last_km_izq).toBeNull()
      expect(m.last_km_der).toBeNull()
    }
  })

  it('delante y detrás llevan recambios distintos', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const bmw = cars.find(c => c.brand === 'BMW')
    const maint = await demo.getMaintenanceRecords(bmw.id)
    const del = maint.find(m => m.type_id === 'neumaticos_del')
    const tras = maint.find(m => m.type_id === 'neumaticos_tras')
    expect(del.part_id).toBeTruthy()
    expect(tras.part_id).toBeTruthy()
    expect(del.part_id).not.toBe(tras.part_id)
  })
})

describe('trabajos libres', () => {
  beforeEach(() => demo.resetDemo())

  it('la demo trae algunos apuntados', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const bmw = cars.find(c => c.brand === 'BMW')
    const jobs = await demo.getCustomJobs(bmw.id)
    expect(jobs.length).toBeGreaterThan(0)
    expect(jobs[0].name).toBeTruthy()
  })

  it('se crean, se editan y se borran', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const car = cars[0]
    const antes = (await demo.getCustomJobs(car.id)).length

    const nuevo = await demo.createCustomJob({ car_id: car.id, name: 'X', km: 10, cost: 5 })
    expect((await demo.getCustomJobs(car.id)).length).toBe(antes + 1)

    await demo.updateCustomJob(nuevo.id, { cost: 25 })
    const editado = (await demo.getCustomJobs(car.id)).find(j => j.id === nuevo.id)
    expect(editado.cost).toBe(25)

    await demo.deleteCustomJob(nuevo.id)
    expect((await demo.getCustomJobs(car.id)).length).toBe(antes)
  })

  it('al borrar el vehículo se van con él', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const bmw = cars.find(c => c.brand === 'BMW')
    expect((await demo.getCustomJobs(bmw.id)).length).toBeGreaterThan(0)
    await demo.deleteCar(bmw.id)
    expect(await demo.getCustomJobs(bmw.id)).toEqual([])
  })
})

describe('el recambio enlazado', () => {
  beforeEach(() => demo.resetDemo())

  it('al borrar un recambio el mantenimiento se queda, sin enlace', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const bmw = cars.find(c => c.brand === 'BMW')
    const maint = await demo.getMaintenanceRecords(bmw.id)
    const conEnlace = maint.find(m => m.part_id)
    expect(conEnlace).toBeTruthy()

    await demo.deleteCarPart(conEnlace.part_id)

    const despues = await demo.getMaintenanceRecords(bmw.id)
    const mismo = despues.find(m => m.type_id === conEnlace.type_id)
    expect(mismo).toBeTruthy()
    expect(mismo.part_id).toBeNull()
  })

  it('el upsert guarda los dos lados y el recambio', async () => {
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const bmw = cars.find(c => c.brand === 'BMW')
    const [recambio] = await demo.getCarParts(bmw.id)

    await demo.upsertMaintenanceRecord({
      car_id: bmw.id, type_id: 'discos_del',
      last_km: 150000, last_date: '2026-01-01',
      last_km_izq: 150000, last_date_izq: '2026-01-01',
      last_km_der: 170000, last_date_der: '2026-06-01',
      next_km: 220000, next_date: null, cost: 210, notes: '',
      part_id: recambio.id,
    })

    const guardado = (await demo.getMaintenanceRecords(bmw.id)).find(m => m.type_id === 'discos_del')
    expect(guardado.last_km_izq).toBe(150000)
    expect(guardado.last_km_der).toBe(170000)
    expect(guardado.part_id).toBe(recambio.id)
    expect(worstSide(guardado)).toBe('izq')
  })
})
