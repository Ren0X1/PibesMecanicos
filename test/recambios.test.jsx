import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

/* ─────────────────────────────────────────────────────────────
   Editar un recambio

   Antes solo se podían crear y borrar: para corregir un enlace o
   cambiar el nombre había que borrar el recambio y volver a crearlo,
   y con eso se perdía el enlace con los mantenimientos que lo
   llevaban. Este fichero defiende que editar:

   - abre el formulario con los datos que ya tenía;
   - guarda lo que se cambia;
   - no suelta el recambio de los mantenimientos que lo usan.
   ───────────────────────────────────────────────────────────── */

vi.mock('../src/lib/demo/mode.js', async (orig) => {
  const real = await orig()
  return { ...real, isDemo: () => true }
})

import { PartFormModal } from '../src/components/CarDetail.jsx'
import * as demo from '../src/lib/demo/store.js'
import { setLang } from '../src/lib/i18n.js'

beforeEach(() => setLang('es'))

describe('el formulario', () => {
  let host, root
  afterEach(async () => {
    await act(async () => { root.unmount() })
    host.remove()
  })

  it('arranca con los datos del recambio y guarda lo cambiado', async () => {
    const onSave = vi.fn()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    const recambio = { id: 'p-x', name: 'Pastillas', reference: 'P06 040', url: '' }
    await act(async () => {
      root.render(<PartFormModal open initial={recambio} onClose={() => {}} onSave={onSave} />)
    })

    expect(document.body.textContent).toContain('Editar recambio')
    const campos = [...document.body.querySelectorAll('input')]
    expect(campos.map(c => c.value)).toEqual(['Pastillas', 'P06 040', ''])

    /* React escucha el evento nativo: hay que pasar por el setter del
       prototipo para que vea el cambio. */
    const escribir = (input, valor) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, valor)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await act(async () => { escribir(campos[2], 'https://tienda.example/p06') })

    const guardar = [...document.body.querySelectorAll('button')].find(b => b.textContent.includes('Guardar'))
    await act(async () => { guardar.click() })
    expect(onSave).toHaveBeenCalledWith({ name: 'Pastillas', reference: 'P06 040', url: 'https://tienda.example/p06' })
  })
})

describe('en la demo', () => {
  beforeEach(() => demo.resetDemo())

  it('editar no suelta el recambio del mantenimiento que lo lleva', async () => {
    const [coche] = await demo.getCars(demo.DEMO_USER_ID)
    /* Un recambio que algún mantenimiento lleve enlazado. */
    const enlazado = (await demo.getMaintenanceRecords(coche.id)).find(m => m.part_id)
    const recambio = (await demo.getCarParts(coche.id)).find(p => p.id === enlazado.part_id)
    const antes = (await demo.getMaintenanceRecords(coche.id)).filter(m => m.part_id === recambio.id).length
    expect(antes).toBeGreaterThan(0)

    const editado = await demo.updateCarPart(recambio.id, { name: 'Nombre nuevo', reference: 'REF-1', url: 'https://x.example' })
    expect(editado).toMatchObject({ id: recambio.id, name: 'Nombre nuevo', reference: 'REF-1', url: 'https://x.example' })

    const despues = (await demo.getMaintenanceRecords(coche.id)).filter(m => m.part_id === recambio.id).length
    expect(despues).toBe(antes)
    const guardado = (await demo.getCarParts(coche.id)).find(p => p.id === recambio.id)
    expect(guardado.name).toBe('Nombre nuevo')
  })
})
