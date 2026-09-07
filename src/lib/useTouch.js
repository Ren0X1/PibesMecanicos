import { useState, useEffect } from 'react'

/* ─────────────────────────────────────────────────────────────
   Detección de dispositivo táctil

   No se mira el ancho de la pantalla ni el «user agent»: un iPad
   en horizontal mide 1024 px y sería un escritorio para cualquier
   regla basada en anchura, cuando lo que queremos saber es cómo
   se apunta.

   · pointer: coarse  → el puntero es un dedo (o un lápiz grueso)
   · hover: none      → no existe el estado «encima sin pulsar»

   Las dos juntas identifican un móvil o una tableta. Solo la
   primera identifica además los portátiles con pantalla táctil,
   donde conviene ACTIVAR los gestos pero NO cambiar la maqueta,
   porque siguen usándose con ratón.
   ───────────────────────────────────────────────────────────── */

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false
  )

  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

/* Táctil de verdad: móvil o tableta. Decide la maqueta. */
export function useIsTouch() {
  return useMediaQuery('(hover: none) and (pointer: coarse)')
}

/* Cualquier cosa que se pueda tocar, incluidos los portátiles
   híbridos. Decide si se activan los gestos — que nunca quitan
   ninguna otra forma de navegar, así que activarlos de más no
   rompe nada. */
export function useCanSwipe() {
  return useMediaQuery('(pointer: coarse)')
}
