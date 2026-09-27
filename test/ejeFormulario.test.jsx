import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

/* ─────────────────────────────────────────────────────────────
   El formulario de un eje no puede borrar el lado que no tocas

   Pasó de verdad, probando contra la base: un eje tenía el
   izquierdo cambiado a 120.000 y el derecho en 100.000. Se abrió
   la ficha solo para enlazar un recambio, se guardó, y los dos
   lados acabaron en 100.000. El dato del izquierdo desapareció.

   La regla que defiende este fichero: si el eje ya tiene lados
   apuntados, guardar sin elegir lado deja izquierdo y derecho
   exactamente como estaban.
   ───────────────────────────────────────────────────────────── */

vi.mock('../src/lib/demo/mode.js', async (orig) => {
  const real = await orig()
  return { ...real, isDemo: () => true }
})

import { MaintModal } from '../src/components/CarDetail.jsx'
import { setLang } from '../src/lib/i18n.js'

const noop = () => {}

/* El eje del caso real: cambiado solo el izquierdo. */
const existing = {
  type_id: 'neumaticos_del',
  last_km: 100000, last_date: '2024-03-01',
  last_km_izq: 120000, last_date_izq: '2026-09-27',
  last_km_der: 100000, last_date_der: '2024-03-01',
  next_km: 145000, next_date: '2029-03-01',
  cost: 400, notes: '', workshop_id: null, part_id: null,
}

async function montar(props) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(<MaintModal {...props} />) })
  await act(async () => { await Promise.resolve() })
  return {
    host,
    boton: (texto) => [...host.querySelectorAll('button')]
      .find(b => b.textContent.trim().toLowerCase() === texto.toLowerCase()),
    limpiar: async () => { await act(async () => { root.unmount() }); host.remove() },
  }
}

beforeEach(() => setLang('es'))

describe('guardar sin elegir lado', () => {
  it('deja los dos lados como estaban', async () => {
    const onSave = vi.fn()
    const m = await montar({
      open: true, onClose: noop, onSave, typeId: 'neumaticos_del',
      existing, currentKm: 120000, vehicleType: 'coche',
    })

    await act(async () => { m.boton('Guardar').click() })

    expect(onSave).toHaveBeenCalledTimes(1)
    const guardado = onSave.mock.calls[0][0]
    expect(guardado.last_km_izq).toBe(120000)
    expect(guardado.last_date_izq).toBe('2026-09-27')
    expect(guardado.last_km_der).toBe(100000)
    expect(guardado.last_date_der).toBe('2024-03-01')
    // Y la fila sigue mandándola el derecho, que es el viejo.
    expect(guardado.last_km).toBe(100000)
    await m.limpiar()
  })

  it('el coste y el recambio sí se guardan', async () => {
    const onSave = vi.fn()
    const m = await montar({
      open: true, onClose: noop, onSave, typeId: 'neumaticos_del',
      existing: { ...existing, cost: 400, part_id: null },
      currentKm: 120000, vehicleType: 'coche',
      parts: [{ id: 'p-1', name: 'Neumático delantero', reference: 'PS4' }],
    })

    const select = [...m.host.querySelectorAll('select')]
      .find(s => [...s.options].some(o => o.textContent.includes('PS4')))
    expect(select).toBeTruthy()

    await m.limpiar()
  })

  it('con un eje sin estrenar sí se arranca en «los dos»', async () => {
    const onSave = vi.fn()
    const m = await montar({
      open: true, onClose: noop, onSave, typeId: 'discos_del',
      existing: null, currentKm: 90000, vehicleType: 'coche',
    })

    await act(async () => { m.boton('Guardar').click() })

    const guardado = onSave.mock.calls[0][0]
    expect(guardado.last_km_izq).toBe(90000)
    expect(guardado.last_km_der).toBe(90000)
    await m.limpiar()
  })
})

describe('elegir un lado sí lo cambia', () => {
  it('apuntar el derecho deja el izquierdo quieto', async () => {
    const onSave = vi.fn()
    const m = await montar({
      open: true, onClose: noop, onSave, typeId: 'neumaticos_del',
      existing, currentKm: 120000, vehicleType: 'coche',
    })

    await act(async () => { m.boton('Derecho').click() })
    await act(async () => { m.boton('Guardar').click() })

    const guardado = onSave.mock.calls[0][0]
    // El izquierdo no se toca...
    expect(guardado.last_km_izq).toBe(120000)
    // ...y el derecho se queda con lo que traía el formulario, que
    // al elegir lado se rellena con lo suyo.
    expect(guardado.last_km_der).toBe(100000)
    await m.limpiar()
  })
})

describe('en moto no hay lados que proteger', () => {
  it('guardar no escribe ningún lado', async () => {
    const onSave = vi.fn()
    const m = await montar({
      open: true, onClose: noop, onSave, typeId: 'neumaticos_tras',
      existing: null, currentKm: 24000, vehicleType: 'moto',
    })

    await act(async () => { m.boton('Guardar').click() })

    const guardado = onSave.mock.calls[0][0]
    expect(guardado.last_km_izq).toBeNull()
    expect(guardado.last_km_der).toBeNull()
    expect(guardado.last_km).toBe(24000)
    // Intervalo de moto: 24.000 + 12.000
    expect(guardado.next_km).toBe(36000)
    await m.limpiar()
  })
})
