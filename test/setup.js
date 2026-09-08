/* Entorno de los tests.

   jsdom no trae todo lo que un navegador de verdad: faltan
   matchMedia —que usan los hooks responsive— y ResizeObserver, del
   que dependen las gráficas. Sin ellos los componentes revientan
   por el entorno, no por un fallo suyo, y eso enmascara los fallos
   de verdad. */

import { beforeEach } from 'vitest'

/* React necesita saber que está en un test para que act() no proteste. */
globalThis.IS_REACT_ACT_ENVIRONMENT = true

/* matchMedia: se devuelve siempre «no coincide», que equivale a un
   escritorio estrecho sin pantalla táctil. Los tests que necesiten
   otra cosa lo sobrescriben. */
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })
}

/* ResizeObserver: lo miran algunos componentes al montarse. */
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

/* scrollIntoView no existe en jsdom, y el chat lo llama cada vez
   que llega un mensaje. */
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {}
}

/* En jsdom todo mide 0×0 y hay componentes que se miden a sí
   mismos al montarse. Se les da un tamaño para que existan. */
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 })
Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 800 })
Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 })

/* Cada fichero empieza limpio: si un test deja preferencias
   guardadas, el siguiente arranca con el idioma o el tema del
   anterior y falla por algo que no está probando. */
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
