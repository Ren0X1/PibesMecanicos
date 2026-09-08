import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

/* ─────────────────────────────────────────────────────────────
   Pintar cada pantalla de verdad.

   Los dos fallos que se colaron —«COLORS is not defined» y
   «colors is not defined»— compilaban sin problema: solo saltaban
   al pintar el componente. Un test que se limite a importar el
   módulo no los ve; hay que montarlo.

   Aquí se monta cada pantalla con datos de ejemplo y se comprueba
   que no lanza. No se mira el aspecto —para eso están las
   maquetas—, solo que la pantalla exista.
   ───────────────────────────────────────────────────────────── */

// La demo no toca la red, así que sirve de fuente de datos.
vi.mock('../src/lib/demo/mode.js', async (orig) => {
  const real = await orig()
  return { ...real, isDemo: () => true }
})

import * as demo from '../src/lib/demo/store.js'
import Dashboard from '../src/components/Dashboard.jsx'
import UserStats from '../src/components/UserStats.jsx'
import Reminders from '../src/components/Reminders.jsx'
import Workshops from '../src/components/Workshops.jsx'
import Groups from '../src/components/Groups.jsx'
import AdminPanel from '../src/components/AdminPanel.jsx'
import CarDetail from '../src/components/CarDetail.jsx'
import ExpenseTab from '../src/components/ExpenseTab.jsx'
import FuelTab from '../src/components/FuelTab.jsx'
import TodoTab from '../src/components/TodoTab.jsx'
import ItvCard from '../src/components/ItvCard.jsx'
import SpendChart from '../src/components/SpendChart.jsx'
import Login from '../src/components/Login.jsx'
import { Onboarding, SettingsModal } from '../src/components/Preferences.jsx'
import NotificationCenter from '../src/components/NotificationCenter.jsx'
import { setLang, LANGS } from '../src/lib/i18n.js'
import { setThemeMode } from '../src/lib/theme.js'

const noop = () => {}

/* Monta el árbol y devuelve el HTML, o lanza si el componente
   revienta al pintar. */
async function render(el) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(el) })
  // dar una vuelta más para los efectos que cargan datos
  await act(async () => { await Promise.resolve() })
  const html = host.innerHTML
  await act(async () => { root.unmount() })
  host.remove()
  return html
}

let user, cars, bmw, maintenance, fuelLogs, todos, itv

beforeEach(async () => {
  demo.resetDemo()
  user = demo.getDemoUser()
  cars = await demo.getCars(demo.DEMO_USER_ID)
  bmw = cars[0]
  maintenance = await demo.getMaintenanceRecords(bmw.id)
  fuelLogs = await demo.getFuelLogs(bmw.id)
  todos = await demo.getVehicleTodos(bmw.id)
  itv = await demo.getItvRecords(bmw.id)
})

describe('las pantallas se pintan', () => {
  it('Login', async () => {
    expect(await render(<Login onLogin={noop} />)).toBeTruthy()
  })

  it('Asistente de bienvenida', async () => {
    expect(await render(<Onboarding user={user} onDone={noop} />)).toBeTruthy()
  })

  it('Ajustes', async () => {
    expect(await render(
      <SettingsModal open user={user} onClose={noop} onSaved={noop} onToast={noop} />
    )).toBeTruthy()
  })

  it('Vehículos', async () => {
    expect(await render(<Dashboard user={user} onToast={noop} />)).toBeTruthy()
  })

  it('Resumen', async () => {
    expect(await render(<UserStats user={user} onToast={noop} />)).toBeTruthy()
  })

  it('Avisos', async () => {
    expect(await render(<Reminders user={user} onToast={noop} />)).toBeTruthy()
  })

  it('Grupos', async () => {
    expect(await render(<Groups user={user} onToast={noop} />)).toBeTruthy()
  })

  it('Talleres', async () => {
    expect(await render(<Workshops user={user} onToast={noop} />)).toBeTruthy()
  })

  it('Admin', async () => {
    expect(await render(<AdminPanel onToast={noop} />)).toBeTruthy()
  })

  it('Notificaciones', async () => {
    expect(await render(
      <NotificationCenter userId={demo.DEMO_USER_ID} isMobile={false} dataVersion={0} />
    )).toBeTruthy()
  })

  it('Ficha completa de un vehículo', async () => {
    expect(await render(
      <CarDetail car={bmw} onBack={noop} onCarUpdated={noop} onToast={noop} />
    )).toBeTruthy()
  })
})

describe('las pestañas de la ficha se pintan', () => {
  it('Gastos — la que reventaba con «colors is not defined»', async () => {
    const html = await render(
      <ExpenseTab maintenance={maintenance} fuelLogs={fuelLogs} isMobile={false} currentKm={bmw.current_km} />
    )
    expect(html).toBeTruthy()
  })

  it('Repostajes', async () => {
    expect(await render(
      <FuelTab carId={bmw.id} carKm={bmw.current_km} fuelLogs={fuelLogs}
        onReload={noop} onToast={noop} isMobile={false} />
    )).toBeTruthy()
  })

  it('Tareas', async () => {
    expect(await render(
      <TodoTab carId={bmw.id} todos={todos} onReload={noop} onToast={noop} isMobile={false} />
    )).toBeTruthy()
  })

  it('ITV', async () => {
    expect(await render(
      <ItvCard carId={bmw.id} itvRecords={itv} onReload={noop} onToast={noop} isMobile={false} />
    )).toBeTruthy()
  })

  it('Gráfico de gasto', async () => {
    expect(await render(<SpendChart maintenance={maintenance} fuelLogs={fuelLogs} />)).toBeTruthy()
  })

  it('Gráfico de gasto sin datos', async () => {
    expect(await render(<SpendChart maintenance={[]} fuelLogs={[]} />)).toBeTruthy()
  })
})

describe('las pantallas se pintan en los seis idiomas', () => {
  for (const l of LANGS) {
    it(l.native, async () => {
      setLang(l.id)
      expect(await render(<Dashboard user={user} onToast={noop} />)).toBeTruthy()
      expect(await render(<UserStats user={user} onToast={noop} />)).toBeTruthy()
      setLang('es')
    })
  }
})

describe('las pantallas se pintan en tema claro', () => {
  it('claro y oscuro', async () => {
    setThemeMode('light')
    expect(await render(<Dashboard user={user} onToast={noop} />)).toBeTruthy()
    expect(await render(<UserStats user={user} onToast={noop} />)).toBeTruthy()
    setThemeMode('dark')
  })
})

/* Los gráficos de recharts se cambiaron por el de área. Aquí queda
   fijado que las pantallas siguen pintando ESE gráfico: el viewBox
   de 0 a 100 es su firma. Si alguien vuelve a meter otra librería,
   o se queda una pantalla sin gráfico, salta aquí. */
describe('todas las pantallas dibujan el gráfico de área', () => {
  const FIRMA = 'viewBox="0 0 100 100"'

  it('Gastos del vehículo', async () => {
    const html = await render(
      <ExpenseTab maintenance={maintenance} fuelLogs={fuelLogs} isMobile={false} currentKm={bmw.current_km} />
    )
    expect(html).toContain(FIRMA)
  })

  it('Resumen', async () => {
    expect(await render(<UserStats user={user} onToast={noop} />)).toContain(FIRMA)
  })

  it('Tarjeta de gasto', async () => {
    const html = await render(<SpendChart maintenance={maintenance} fuelLogs={fuelLogs} />)
    expect(html).toContain(FIRMA)
  })
})
