/* ─────────────────────────────────────────────────────────────
   Modo demo
   La aplicación entra en modo demo cuando la ruta es /demo. En
   ese modo NO se habla con Supabase: todo sale de datos estáticos
   guardados en el navegador, y los cambios que haga el visitante
   se quedan en su sesión.
   ───────────────────────────────────────────────────────────── */

function detect() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname.replace(/\/+$/, '')
  return path === '/demo' || path.endsWith('/demo')
}

let active = detect()
const listeners = new Set()

export function isDemo() { return active }

export function onDemoChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify() { listeners.forEach(fn => fn(active)) }

export function enterDemo() {
  active = true
  if (!detect()) window.history.pushState({}, '', '/demo')
  notify()
}

export function exitDemo() {
  active = false
  window.history.pushState({}, '', '/')
  notify()
}

// El botón «atrás» del navegador también cambia el modo.
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const next = detect()
    if (next !== active) { active = next; notify() }
  })
}
