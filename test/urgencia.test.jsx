import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

/* ─────────────────────────────────────────────────────────────
   La ficha, ordenada por lo que toca

   Tres cosas que defiende este fichero:

   - el orden: primero lo vencido, luego lo próximo, luego lo que
     está al día; y dentro de cada grupo, lo que menos km tiene por
     delante, o lo que más vida lleva gastada si se mide en meses;
   - que cada pieza de la lista tenga su icono de línea, para que
     no vuelva un emoji ni se cuele la llave inglesa de repuesto;
   - que la papelera, ahora dentro del formulario, pregunte antes
     de borrar.
   ───────────────────────────────────────────────────────────── */

vi.mock('../src/lib/demo/mode.js', async (orig) => {
  const real = await orig()
  return { ...real, isDemo: () => true }
})

import { MaintModal } from '../src/components/CarDetail.jsx'
import { MAINT_TYPES, maintProgress, byUrgency } from '../src/lib/constants.js'
import { hasMaintIcon } from '../src/lib/maintIcons.jsx'
import { setLang } from '../src/lib/i18n.js'

const enDias = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

beforeEach(() => setLang('es'))

describe('cuánto queda', () => {
  it('cuenta los km que faltan y la vida gastada', () => {
    const p = maintProgress({ last_km: 178000, next_km: 188000 }, 187450)
    expect(p.kmLeft).toBe(550)
    expect(p.fraction).toBeCloseTo(0.945, 3)
  })

  it('un vencido tiene km negativos y la barra llena', () => {
    const p = maintProgress({ last_km: 166200, next_km: 186200 }, 187450)
    expect(p.kmLeft).toBe(-1250)
    expect(p.fraction).toBe(1)
  })

  it('una pieza sin intervalo no tiene ni km ni vida', () => {
    const p = maintProgress({ last_km: 170000, next_km: 0, next_date: '' }, 187450)
    expect(p.kmLeft).toBeNull()
    expect(p.fraction).toBeNull()
  })
})

describe('el orden', () => {
  const km = 100000
  const item = (id, record) => ({ mt: { id }, record })

  it('vencido, próximo y al día, en ese orden', () => {
    const lista = byUrgency([
      item('al_dia', { last_km: 90000, next_km: 130000 }),
      item('vencido', { last_km: 80000, next_km: 99000 }),
      item('proximo', { last_km: 91000, next_km: 101000 }),
    ], km)
    expect(lista.map(x => x.mt.id)).toEqual(['vencido', 'proximo', 'al_dia'])
  })

  it('si los dos se miden en km, va antes el que menos km tiene por delante', () => {
    /* El caso de la MT-07: las pastillas llevan más vida gastada,
       pero el aceite toca antes. */
    const lista = byUrgency([
      item('pastillas', { last_km: 10500, next_km: 30500 }),
      item('aceite', { last_km: 18200, next_km: 27200 }),
    ], 24310)
    expect(lista.map(x => x.mt.id)).toEqual(['aceite', 'pastillas'])
  })

  it('si uno se mide solo en meses, manda la vida gastada', () => {
    const lista = byUrgency([
      item('km_mitad', { last_km: 80000, next_km: 120000 }),
      item('meses_casi', { last_km: null, next_km: 0, last_date: enDias(-330), next_date: enDias(35) }),
    ], km)
    expect(lista.map(x => x.mt.id)).toEqual(['meses_casi', 'km_mitad'])
  })

  it('lo que no tiene intervalo va al final de los suyos', () => {
    const lista = byUrgency([
      item('sin_intervalo', { last_km: 95000, next_km: 0 }),
      item('con_intervalo', { last_km: 95000, next_km: 140000 }),
    ], km)
    expect(lista.map(x => x.mt.id)).toEqual(['con_intervalo', 'sin_intervalo'])
  })
})

describe('los iconos', () => {
  it('cada pieza de la lista tiene el suyo', () => {
    const sinIcono = MAINT_TYPES.filter(m => !hasMaintIcon(m.id)).map(m => m.id)
    expect(sinIcono).toEqual([])
  })
})

describe('borrar desde el formulario', () => {
  const existing = {
    type_id: 'aceite', last_km: 178000, last_date: '2026-07-05',
    next_km: 188000, next_date: '2027-07-05', cost: 97, notes: '',
    workshop_id: null, part_id: null,
  }
  let host, root
  const montar = async (props) => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => { root.render(<MaintModal open onClose={() => {}} onSave={() => {}} typeId="aceite"
      currentKm={187450} vehicleType="coche" {...props} />) })
  }
  const borrar = () => [...document.body.querySelectorAll('button')]
    .find(b => b.textContent.trim() === 'Eliminar')
  afterEach(async () => {
    await act(async () => { root.unmount() })
    host.remove()
    vi.restoreAllMocks()
  })

  it('pregunta, y si se dice que no, no borra', async () => {
    const onDelete = vi.fn()
    const pregunta = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await montar({ existing, onDelete })
    await act(async () => { borrar().click() })
    expect(pregunta).toHaveBeenCalledOnce()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('si se dice que sí, borra', async () => {
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await montar({ existing, onDelete })
    await act(async () => { borrar().click() })
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('no sale cuando todavía no hay nada que borrar', async () => {
    await montar({ existing: null, onDelete: vi.fn() })
    expect(borrar()).toBeUndefined()
  })
})
