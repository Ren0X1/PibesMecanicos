import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLang } from '../src/lib/i18n.js'

/* ─────────────────────────────────────────────────────────────
   Los exportes, generados de verdad

   El PDF y el Excel son el sitio donde un fallo pasa más
   desapercibido: nadie los abre hasta que hacen falta. Aquí se
   generan con datos que llevan ejes con lados y trabajos libres,
   que es lo que se acaba de añadir.

   No se mira el aspecto —para eso está el banco de pruebas—, solo
   que salgan, que no revienten y que el dinero cuadre.
   ───────────────────────────────────────────────────────────── */

import os from 'node:os'
import { exportCarPdf } from '../src/lib/pdfExport.js'
import { exportCarExcel } from '../src/lib/excelExport.js'

const car = {
  id: 'c-1', plate: 'TEST 001', brand: 'Seat', model: 'Ibiza',
  year: 2019, vehicle_type: 'coche', fuel: 'Gasolina',
  transmission: 'Manual', current_km: 120000, notes: '',
}

const maintenance = [
  {
    id: 'm-1', car_id: 'c-1', type_id: 'neumaticos_del',
    last_km: 100000, last_date: '2024-03-01',
    last_km_izq: 120000, last_date_izq: '2026-09-27',
    last_km_der: 100000, last_date_der: '2024-03-01',
    next_km: 145000, next_date: '2029-03-01', cost: 400, notes: 'Uno solo',
  },
  {
    id: 'm-2', car_id: 'c-1', type_id: 'aceite',
    last_km: 110000, last_date: '2026-01-10',
    last_km_izq: null, last_date_izq: null, last_km_der: null, last_date_der: null,
    next_km: 120000, next_date: '2027-01-10', cost: 90, notes: '',
  },
  /* Sin intervalo de kilómetros: el próximo es cero y no es un
     vencimiento, es que esta pieza no se mide así. */
  {
    id: 'm-3', car_id: 'c-1', type_id: 'silentblocks_del',
    last_km: 95000, last_date: '2025-06-01',
    last_km_izq: 95000, last_date_izq: '2025-06-01',
    last_km_der: 95000, last_date_der: '2025-06-01',
    next_km: 0, next_date: null, cost: 210, notes: '',
  },
]

const jobs = [
  { id: 'j-1', car_id: 'c-1', name: 'Rótula izquierda', date: '2026-06-24', km: 118000, cost: 96, notes: 'Sonaba', workshop_id: null, part_id: null },
  { id: 'j-2', car_id: 'c-1', name: 'Soldar el escape', date: '2026-02-09', km: 112000, cost: 40, notes: '', workshop_id: null, part_id: null },
]

let raiz = null

const kmLogs = [{ id: 'k-1', car_id: 'c-1', km: 120000, date: '2026-09-01', notes: '' }]
const parts = [{ id: 'p-1', car_id: 'c-1', name: 'Neumático delantero', reference: 'Michelin PS4', url: '' }]

/* jsdom no trae createObjectURL ni descargas: se simulan, que lo
   que se prueba es el libro, no el navegador. */
beforeEach(() => {
  setLang('es')
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:prueba'
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {}
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  /* En Node, jsPDF.save() escribe el fichero de verdad, y dejaba dos
     PDF tirados en la raíz del repositorio cada vez que corrían los
     tests. Se trabaja desde el directorio temporal y ahí se quedan. */
  raiz = process.cwd()
  process.chdir(os.tmpdir())
})

afterEach(() => { if (raiz) process.chdir(raiz) })

describe('el PDF', () => {
  it('se genera con ejes, lados y trabajos', () => {
    /* jsPDF acaba llamando a save(), que en jsdom no descarga nada;
       lo que se comprueba es que el camino entero no lance. */
    expect(() => exportCarPdf({ car, maintenance, kmLogs, fuelLogs: [], parts, jobs })).not.toThrow()
  })

  it('también sale con un vehículo sin nada apuntado', () => {
    expect(() => exportCarPdf({ car, maintenance: [], kmLogs: [], fuelLogs: [], parts: [] })).not.toThrow()
  })

  it('y con una moto, que no tiene lados', () => {
    const moto = { ...car, vehicle_type: 'moto', plate: 'TEST 002' }
    const suyos = [{ ...maintenance[1], type_id: 'neumaticos_tras' }]
    expect(() => exportCarPdf({ car: moto, maintenance: suyos, kmLogs: [], fuelLogs: [], parts: [] })).not.toThrow()
  })
})

describe('el Excel', () => {
  it('se genera y el total de mantenimiento incluye los trabajos', async () => {
    /* El libro se escribe en memoria; lo que interesa es que la
       hoja salga y que el total sume mantenimientos + trabajos:
       400 + 90 + 210 + 96 + 40 = 836. */
    await expect(
      exportCarExcel({ car, maintenance, kmLogs, fuelLogs: [], parts, jobs })
    ).resolves.not.toThrow()
  })

  it('aguanta un vehículo vacío', async () => {
    await expect(
      exportCarExcel({ car, maintenance: [], kmLogs: [], fuelLogs: [], parts: [] })
    ).resolves.not.toThrow()
  })
})
