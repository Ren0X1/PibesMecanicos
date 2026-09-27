import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

/* ─────────────────────────────────────────────────────────────
   Modo mantenimiento

   Lo que hay que defender: que apagar la web deje fuera a todo el
   mundo menos a quien tiene que volver a encenderla, y que si la
   consulta falla la web siga abierta. Una web caída por no poder
   preguntar si está caída sería peor que el problema.
   ───────────────────────────────────────────────────────────── */

vi.mock('../src/lib/demo/mode.js', async (orig) => {
  const real = await orig()
  return { ...real, isDemo: () => true }
})

import * as demo from '../src/lib/demo/store.js'
import MaintenanceWall, { MaintenanceBanner } from '../src/components/MaintenanceWall.jsx'
import AdminPanel from '../src/components/AdminPanel.jsx'
import { setLang } from '../src/lib/i18n.js'

const noop = () => {}

async function render(el) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(el) })
  await act(async () => { await Promise.resolve() })
  const html = host.innerHTML
  await act(async () => { root.unmount() })
  host.remove()
  return html
}

describe('el interruptor', () => {
  beforeEach(() => { demo.resetDemo(); setLang('es') })

  it('nace apagado', async () => {
    const estado = await demo.getMaintenanceMode()
    expect(estado.on).toBe(false)
  })

  it('se enciende y se apaga, y recuerda el aviso', async () => {
    await demo.setMaintenanceMode({ on: true, message: 'Volvemos en una hora', userId: demo.DEMO_USER_ID })
    let estado = await demo.getMaintenanceMode()
    expect(estado.on).toBe(true)
    expect(estado.message).toBe('Volvemos en una hora')
    expect(estado.updated_by).toBe(demo.DEMO_USER_ID)
    expect(estado.updated_at).toBeTruthy()

    await demo.setMaintenanceMode({ on: false, message: '' })
    estado = await demo.getMaintenanceMode()
    expect(estado.on).toBe(false)
  })

  it('reiniciar la demo lo deja apagado otra vez', async () => {
    await demo.setMaintenanceMode({ on: true, message: 'x' })
    demo.resetDemo()
    expect((await demo.getMaintenanceMode()).on).toBe(false)
  })

  it('la demo y la real ofrecen la misma función', async () => {
    const real = await import('../src/lib/supabase.js')
    expect(typeof real.getMaintenanceMode).toBe('function')
    expect(typeof real.setMaintenanceMode).toBe('function')
  })
})

describe('la pantalla de web apagada', () => {
  beforeEach(() => setLang('es'))

  it('se pinta y enseña el aviso escrito por el administrador', async () => {
    const html = await render(
      <MaintenanceWall user={null} message="Volvemos en una hora" onLogin={noop} onLogout={noop} />
    )
    expect(html).toContain('Volvemos en una hora')
    expect(html).toContain('En mantenimiento')
  })

  it('sin aviso propio pone el de siempre', async () => {
    const html = await render(<MaintenanceWall user={null} message="" onLogin={noop} onLogout={noop} />)
    expect(html).toContain('Estamos haciendo cambios')
  })

  /* Este fichero corre como si estuviéramos dentro de la demo, y
     ahí la puerta que toca es la de salir de ella: el acceso de
     administración se prueba en muroDemo.test.jsx. */
  it('dentro de la demo ofrece salir de la demo', async () => {
    const html = await render(<MaintenanceWall user={null} message="" onLogin={noop} onLogout={noop} />)
    expect(html).toContain('Salir de la demo')
  })

  it('a quien ha entrado y no es administrador se lo dice', async () => {
    const html = await render(
      <MaintenanceWall user={{ id: 'u', name: 'Nuria', role: 'user' }} message="" onLogin={noop} onLogout={noop} />
    )
    expect(html).toContain('no es de administración')
    expect(html).not.toContain('Acceso de administración')
  })

  it('se pinta en los seis idiomas', async () => {
    for (const lang of ['en', 'es', 'zh', 'de', 'fr', 'ru']) {
      setLang(lang)
      const html = await render(<MaintenanceWall user={null} message="" onLogin={noop} onLogout={noop} />)
      expect(html.length).toBeGreaterThan(100)
    }
    setLang('es')
  })

  it('la tira del administrador lleva el atajo para apagarlo', async () => {
    const html = await render(<MaintenanceBanner onGoPanel={noop} />)
    expect(html).toContain('Modo mantenimiento activado')
    expect(html).toContain('Desactivar')
  })
})

describe('mantener la base despierta', () => {
  beforeEach(() => { demo.resetDemo(); setLang('es') })

  it('la demo llega con el interruptor puesto y un toque reciente', async () => {
    const estado = await demo.getKeepAlive()
    expect(estado.on).toBe(true)
    expect(estado.everyHours).toBe(6)
    expect(estado.lastPingAt).toBeTruthy()
    const horas = (Date.now() - new Date(estado.lastPingAt).getTime()) / 3600000
    expect(horas).toBeLessThan(24)
  })

  it('se apaga y se vuelve a encender', async () => {
    await demo.setKeepAlive({ on: false, userId: demo.DEMO_USER_ID })
    expect((await demo.getKeepAlive()).on).toBe(false)
    await demo.setKeepAlive({ on: true, userId: demo.DEMO_USER_ID })
    expect((await demo.getKeepAlive()).on).toBe(true)
  })

  it('apagarlo no borra la marca del último toque', async () => {
    const antes = await demo.getKeepAlive()
    await demo.setKeepAlive({ on: false })
    const despues = await demo.getKeepAlive()
    expect(despues.lastPingAt).toBe(antes.lastPingAt)
  })

  it('la demo y la real ofrecen la misma función', async () => {
    const real = await import('../src/lib/supabase.js')
    expect(typeof real.getKeepAlive).toBe('function')
    expect(typeof real.setKeepAlive).toBe('function')
  })
})

describe('el panel de administración', () => {
  beforeEach(() => { demo.resetDemo(); setLang('es') })

  it('trae la pestaña de la web', async () => {
    const user = demo.getDemoUser()
    const html = await render(<AdminPanel user={user} onToast={noop} onMaintenanceChange={noop} />)
    expect(html).toContain('La web')
  })

  /* El contenido de la pestaña no existe hasta que se pulsa, así
     que hay que pulsarla de verdad: montar y mirar no basta. */
  it('al entrar en la pestaña salen los dos interruptores', async () => {
    const user = demo.getDemoUser()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    await act(async () => { root.render(<AdminPanel user={user} onToast={noop} onMaintenanceChange={noop} />) })
    await act(async () => { await Promise.resolve() })

    const boton = [...host.querySelectorAll('button')].find(b => b.textContent.includes('La web'))
    expect(boton).toBeTruthy()
    await act(async () => { boton.click() })

    expect(host.innerHTML).toContain('Modo mantenimiento')
    expect(host.innerHTML).toContain('Mantener la base despierta')
    expect(host.innerHTML).toContain('Último toque')

    await act(async () => { root.unmount() })
    host.remove()
  })
})
