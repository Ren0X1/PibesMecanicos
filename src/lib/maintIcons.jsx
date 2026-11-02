import {
  Droplet, Droplets, Funnel, Wind, Fuel, Octagon, Disc, CircleDot, ArrowDownUp,
  Snowflake, BatteryMedium, Settings2, Zap, Flame, Fan, Link, Cog, RefreshCw,
  Brush, Hexagon, Nut, Wrench,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   El icono de cada mantenimiento

   Antes cada fila llevaba su emoji (🛢️ 💨 ⭕): siete colores en un
   sistema que tiene uno solo, y un dibujo distinto en cada sistema
   operativo. Ahora es un icono de línea, del mismo juego que el
   resto de la aplicación, y del color del texto que lo rodea.

   El emoji sigue en constants.js porque lo usan los avisos y las
   notificaciones del sistema, que no pintan componentes.
   ───────────────────────────────────────────────────────────── */
const ICONOS = {
  aceite: Droplet,
  filtro_aceite: Funnel,
  filtro_aire: Wind,
  filtro_combustible: Fuel,
  pastillas_del: Octagon, pastillas_tras: Octagon,
  discos_del: Disc, discos_tras: Disc,
  neumaticos_del: CircleDot, neumaticos_tras: CircleDot,
  amortiguadores_del: ArrowDownUp, amortiguadores_tras: ArrowDownUp,
  liquido_frenos: Droplets,
  refrigerante: Snowflake,
  bateria: BatteryMedium,
  embrague: Settings2,
  bujias: Zap,
  calentadores: Flame,
  filtro_habitaculo: Fan,
  correa_dist: Link,
  diferencial: Cog,
  caja_cambios: RefreshCw,
  escobillas: Brush,
  silentblocks_del: Hexagon, silentblocks_tras: Hexagon,
  cadena: Link,
  kit_arrastre: Cog,
  liquido_embrague: Droplets,
  rodamientos: Nut,
}

/* Para el test: que ninguna pieza de la lista se quede con la llave
   inglesa de repuesto. */
export const hasMaintIcon = (id) => id in ICONOS

export function MaintIcon({ id, size = 15, color, style }) {
  const Icono = ICONOS[id] || Wrench
  return <Icono size={size} color={color} strokeWidth={1.75} style={{ flexShrink: 0, ...style }} aria-hidden="true" />
}
