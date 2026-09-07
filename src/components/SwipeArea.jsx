import { useRef, useState, useEffect, useCallback, useId } from 'react'
import { useCanSwipe } from '../lib/useTouch.js'

/* ─────────────────────────────────────────────────────────────
   Deslizamiento horizontal entre secciones

   Los oyentes van en el DOCUMENTO, no en el elemento. Si fueran
   en el elemento, el gesto solo respondería donde hay contenido:
   en una pantalla con dos fichas, la mitad de abajo estaría
   muerta. Lo que se mueve sigue siendo el elemento; lo que
   escucha es toda la pantalla.

   Cómo se decide el gesto, en orden:

   1. Al tocar se guarda el punto de partida y NO se decide nada.
   2. En el primer movimiento apreciable se fija el eje: si el dedo
      va más en horizontal que en vertical, el gesto es nuestro; si
      no, se cede y la página hace scroll con normalidad. La
      decisión se toma UNA vez y no se revisa, que es lo que evita
      que el contenido tiemble al bajar con el dedo torcido.
   3. Mientras el eje es horizontal, el contenido sigue al dedo,
      con resistencia en los extremos.
   4. Al soltar: si se ha recorrido bastante, o poco pero rápido,
      se cambia de sección; si no, vuelve a su sitio.

   Se cede el gesto —sin discutir— cuando hay un modal abierto,
   cuando se empieza sobre algo que se desplaza en horizontal (una
   tabla ancha), cuando hay más de un dedo, o cuando se empieza
   pegado al borde izquierdo, que está reservado para «volver».
   ───────────────────────────────────────────────────────────── */

const AXIS_LOCK = 10      // px antes de decidir el eje
const COMMIT_RATIO = 0.22 // fracción del ancho que hay que recorrer
const COMMIT_MAX = 90     // ...o este recorrido en px, lo que sea menor
const FLICK_SPEED = 0.45  // px/ms: un golpe rápido cambia aunque sea corto
const EDGE_ZONE = 26      // px reservados a la izquierda para «volver»

/* Cuando hay varias zonas deslizables anidadas —el detalle de un
   vehículo vive dentro de la vista principal— solo debe responder
   la más interna. Se registran en una pila y manda la última. */
const stack = []

function inHorizontalScroller(el, root) {
  while (el && el !== root && el.nodeType === 1) {
    if (el.scrollWidth > el.clientWidth + 2) {
      const ox = getComputedStyle(el).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
    }
    el = el.parentElement
  }
  return false
}

export default function SwipeArea({
  index, count, onChange, children,
  enabled = true, style,
}) {
  const canSwipe = useCanSwipe()
  const active = enabled && canSwipe && count > 1
  const id = useId()

  const ref = useRef(null)
  const g = useRef({ x: 0, y: 0, t: 0, axis: null, tracking: false })
  const dxRef = useRef(0)
  const [dx, setDx] = useState(0)
  const [settling, setSettling] = useState(false)

  const setOffset = (v) => { dxRef.current = v; setDx(v) }

  // Registro en la pila: la zona más interna es la que manda.
  useEffect(() => {
    if (!active) return
    stack.push(id)
    return () => {
      const i = stack.lastIndexOf(id)
      if (i !== -1) stack.splice(i, 1)
    }
  }, [active, id])

  const commit = useCallback((dir) => {
    const next = index + dir
    if (next < 0 || next >= count) { setSettling(true); setOffset(0); return }
    const w = ref.current?.offsetWidth || window.innerWidth || 320

    // Sale por su lado, cambia de sección y entra por el contrario.
    setSettling(true)
    setOffset(-dir * Math.min(w * 0.28, 120))
    setTimeout(() => {
      onChange(next)
      setSettling(false)
      setOffset(dir * Math.min(w * 0.22, 90))
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setSettling(true)
        setOffset(0)
      }))
    }, 130)
  }, [index, count, onChange])

  useEffect(() => {
    if (!active) return

    const mine = () => stack[stack.length - 1] === id

    const onStart = (e) => {
      if (!mine()) return
      if (e.touches.length !== 1) return
      if (document.body.dataset.modalOpen === '1') return
      const t = e.touches[0]
      if (t.clientX < EDGE_ZONE) return           // zona de «volver»
      if (inHorizontalScroller(e.target, document.body)) return
      g.current = { x: t.clientX, y: t.clientY, t: e.timeStamp, axis: null, tracking: true }
      setSettling(false)
    }

    const onMove = (e) => {
      const s = g.current
      if (!s.tracking || e.touches.length !== 1) return
      const t = e.touches[0]
      const ddx = t.clientX - s.x
      const ddy = t.clientY - s.y

      if (s.axis === null) {
        if (Math.abs(ddx) < AXIS_LOCK && Math.abs(ddy) < AXIS_LOCK) return
        s.axis = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y'
        if (s.axis === 'y') { s.tracking = false; return }
      }

      // A partir de aquí el gesto es nuestro: se corta el scroll.
      if (e.cancelable) e.preventDefault()

      const atStart = index === 0 && ddx > 0
      const atEnd = index === count - 1 && ddx < 0
      setOffset(atStart || atEnd ? ddx * 0.28 : ddx)
    }

    const onEnd = (e) => {
      const s = g.current
      if (!s.tracking || s.axis !== 'x') { g.current.tracking = false; return }
      g.current.tracking = false

      const w = ref.current?.offsetWidth || window.innerWidth || 320
      const threshold = Math.min(w * COMMIT_RATIO, COMMIT_MAX)
      const elapsed = Math.max(1, e.timeStamp - s.t)
      const travelled = dxRef.current
      const speed = Math.abs(travelled) / elapsed

      if (Math.abs(travelled) > threshold || speed > FLICK_SPEED) {
        commit(travelled < 0 ? 1 : -1)
      } else {
        setSettling(true)
        setOffset(0)
      }
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd, { passive: true })
    document.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [active, index, count, commit, id])

  // Al cambiar de sección desde la barra, nada de arrastre pendiente.
  useEffect(() => { setOffset(0) }, [index])

  const w = ref.current?.offsetWidth || 1
  const fade = Math.min(0.45, Math.abs(dx) / w * 1.1)

  return (
    <div
      ref={ref}
      style={{
        /* Que ocupe siempre la pantalla: así el arrastre se ve
           aunque la sección tenga dos líneas de contenido. */
        minHeight: active ? '60vh' : undefined,
        transform: dx ? `translate3d(${dx}px,0,0)` : undefined,
        opacity: dx ? 1 - fade : 1,
        transition: settling ? 'transform .16s ease-out, opacity .16s ease-out' : 'none',
        willChange: active ? 'transform' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ── Deslizar desde el borde izquierdo para volver ──────────────
   Es el gesto de «atrás» de iOS. Solo cuenta si empieza pegado al
   borde, que es la franja que SwipeArea se salta a propósito. */
export function useEdgeBack(onBack, enabled = true) {
  const canSwipe = useCanSwipe()
  const active = enabled && canSwipe && typeof onBack === 'function'

  useEffect(() => {
    if (!active) return
    let s = null

    const onStart = (e) => {
      if (e.touches.length !== 1) return
      if (document.body.dataset.modalOpen === '1') return
      const t = e.touches[0]
      if (t.clientX > EDGE_ZONE) return
      s = { x: t.clientX, y: t.clientY, t: e.timeStamp }
    }

    const onEnd = (e) => {
      if (!s) return
      const t = e.changedTouches[0]
      const ddx = t.clientX - s.x
      const ddy = Math.abs(t.clientY - s.y)
      const fast = ddx / Math.max(1, e.timeStamp - s.t) > 0.35
      if (ddx > 70 && ddy < 60 && (ddx > 120 || fast)) onBack()
      s = null
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  }, [active, onBack])
}
