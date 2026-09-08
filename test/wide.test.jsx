import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

/* ─────────────────────────────────────────────────────────────
   Las pantallas anchas.

   El resto de los tests corren con matchMedia diciendo que no a
   todo, que equivale a un móvil: así nunca se probaba la mitad
   ancha del código —las dos y tres columnas, el raíl del admin,
   el chat partido de los grupos—, que es justo donde vive la
   maqueta nueva.

   Aquí se dice que sí a cualquier «min-width» y se monta todo
   otra vez. No se mira el aspecto: se comprueba que la rama ancha
   no revienta y que la columna de contexto llega a pintarse.
   ───────────────────────────────────────────────────────────── */

vi.mock('../src/lib/demo/mode.js', async (orig) => {
  const real = await orig()
  return { ...real, isDemo: () => true }
})

import * as demo from '../src/lib/demo/store.js'
import CarDetail from '../src/components/CarDetail.jsx'
import UserStats from '../src/components/UserStats.jsx'
import Reminders from '../src/components/Reminders.jsx'
import Workshops from '../src/components/Workshops.jsx'
import Groups from '../src/components/Groups.jsx'
import AdminPanel from '../src/components/AdminPanel.jsx'
import { t, setLang } from '../src/lib/i18n.js'

const noop = () => {}
let original

beforeEach(async () => {
  setLang('en')
  original = window.matchMedia
  /* Todo lo que sea «a partir de tantos píxeles» se cumple: es una
     pantalla ancha. Lo de «hover: none» no, que eso es un dedo. */
  window.matchMedia = (query) => ({
    matches: /min-width/.test(query) && !/hover:\s*none/.test(query),
    media: query,
    onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {},
    dispatchEvent: () => false,
  })
  demo.resetDemo()
})

afterEach(() => { window.matchMedia = original })

async function render(el) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(el) })
  // dos vueltas: las pantallas cargan sus datos y luego los pintan
  await act(async () => { await Promise.resolve() })
  await act(async () => { await Promise.resolve() })
  const html = host.innerHTML
  await act(async () => { root.unmount() })
  host.remove()
  return html
}

describe('la maqueta ancha se pinta', () => {
  it('Ficha completa · la columna lleva ITV, tareas y gasto', async () => {
    const user = demo.getDemoUser()
    const cars = await demo.getCars(demo.DEMO_USER_ID)
    const html = await render(
      <CarDetail car={cars[0]} onBack={noop} onCarUpdated={noop} onToast={noop} />
    )
    expect(html).toContain(t('car.tabTodos'))
    expect(html).toContain(t('car.tabExpenses'))
    expect(user).toBeTruthy()
  })

  it('Resumen · la columna lleva lo que requiere atención', async () => {
    const html = await render(<UserStats user={demo.getDemoUser()} onToast={noop} />)
    expect(html).toContain(t('stats.attention'))
    expect(html).toContain(t('stats.costPerKm'))
  })

  it('Avisos · las tres cajas', async () => {
    const html = await render(<Reminders user={demo.getDemoUser()} onToast={noop} />)
    expect(html).toContain(t('rem.thisWeek'))
    expect(html).toContain(t('rem.fromCars'))
    expect(html).toContain(t('rem.next90'))
  })

  it('Talleres · gasto e historial del elegido', async () => {
    const html = await render(<Workshops user={demo.getDemoUser()} onToast={noop} />)
    expect(html).toContain(t('wsh.spentHere'))
    expect(html).toContain(t('wsh.history'))
  })

  it('Grupos · lista, chat y miembros a la vez', async () => {
    const html = await render(<Groups user={demo.getDemoUser()} onToast={noop} />)
    expect(html).toContain(t('grp.writeMsg'))
    expect(html).toContain(t('grp.members'))
  })

  it('Admin · solicitudes y estado de la flota', async () => {
    const html = await render(<AdminPanel onToast={noop} />)
    expect(html).toContain(t('adm.requests'))
    expect(html).toContain(t('adm.fleet'))
  })
})
