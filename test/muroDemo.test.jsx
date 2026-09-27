import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

/* ─────────────────────────────────────────────────────────────
   La demo no es la puerta de atrás

   Con la web en mantenimiento se podía entrar igual por /demo: el
   cartel de «cerrado» solo tapaba la puerta principal. Aquí se
   defiende lo contrario:

   - el acceso que ofrece el muro NO enseña el botón de la demo;
   - y si el cartel te pilla dentro, tienes la salida a la vista.
   ───────────────────────────────────────────────────────────── */

vi.mock('../src/lib/demo/mode.js', async (orig) => {
  const real = await orig()
  return { ...real, isDemo: () => true }
})

import MaintenanceWall from '../src/components/MaintenanceWall.jsx'
import Login from '../src/components/Login.jsx'
import { setLang, t } from '../src/lib/i18n.js'

const noop = () => {}

async function render(el) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(el) })
  await act(async () => { await Promise.resolve() })
  const html = host.innerHTML
  const botones = [...host.querySelectorAll('button')].map(b => b.textContent.trim())
  await act(async () => { root.unmount() })
  host.remove()
  return { html, botones }
}

beforeEach(() => setLang('es'))

describe('el acceso desde el muro', () => {
  it('no ofrece entrar en la demo', async () => {
    const { html } = await render(<Login onLogin={noop} sinDemo />)
    expect(html).not.toContain(t('login.demoBtn'))
  })

  it('pero el acceso normal sí la ofrece', async () => {
    const { html } = await render(<Login onLogin={noop} />)
    expect(html).toContain(t('login.demoBtn'))
  })
})

describe('el muro estando dentro de la demo', () => {
  it('enseña la salida', async () => {
    const { botones } = await render(
      <MaintenanceWall user={null} message="" onLogin={noop} onLogout={noop} />
    )
    expect(botones.some(b => b.includes(t('demo.exit')))).toBe(true)
  })

  it('y no repite dos botones que dicen lo mismo', async () => {
    const { botones } = await render(
      <MaintenanceWall user={{ id: 'u', role: 'user' }} message="" onLogin={noop} onLogout={noop} />
    )
    expect(botones.filter(b => b === t('nav.logout')).length).toBe(0)
    expect(botones.length).toBe(1)
  })
})
