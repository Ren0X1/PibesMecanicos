import { theme, css } from '../lib/theme.js'
import { useMediaQuery } from '../lib/useTouch.js'

/* ─────────────────────────────────────────────────────────────
   Maqueta de dos columnas

   El lenguaje que se eligió para todas las pantallas anchas: el
   contenido a la izquierda y, a la derecha, una columna fija con
   lo que hay que mirar hoy. Esa columna no cambia al cambiar de
   pestaña ni al bajar por la lista, así que lo importante —lo que
   está vencido, lo que se ha gastado— no se pierde de vista.

   El corte está en 1024 px, que es el iPad mini de lado. Por
   debajo no hay sitio para dos columnas de verdad: el contexto se
   queda debajo del contenido y se lee en el mismo orden.

   Es anchura, no táctil: un iPad de lado tiene sitio de sobra para
   las dos columnas aunque se maneje con el dedo.
   ───────────────────────────────────────────────────────────── */

/* Alto de la barra superior, que es lo que hay que descontar para
   que la columna se quede pegada justo debajo. El banner de la
   demo se suma aparte con su variable. */
const NAV_HEIGHT = 54
const GAP = 14

export function useTwoCol() {
  const two = useMediaQuery('(min-width: 1024px)')
  const wide = useMediaQuery('(min-width: 1400px)')
  const xwide = useMediaQuery('(min-width: 1800px)')
  return { two, wide, xwide }
}

/* `narrow` dice qué hacer con la columna cuando no cabe:

     below  (por defecto)  se queda debajo del contenido
     above                 se queda encima
     hide                  no se pinta

   «hide» es para lo que en estrecho ya está a un toque en otra
   pestaña: repetirlo ahí solo alarga la página. */
export default function TwoColumn({ children, context, narrow = 'below' }) {
  const { two, wide, xwide } = useTwoCol()

  if (!two || !context) {
    if (!context || narrow === 'hide') return <>{children}</>
    return narrow === 'above'
      ? <>{context}{children}</>
      : <>{children}{context}</>
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `minmax(0, 1fr) ${xwide ? 360 : wide ? 330 : 290}px`,
      gap: GAP,
      alignItems: 'start',
    }}>
      <div style={{ minWidth: 0 }}>{children}</div>
      <aside style={{
        position: 'sticky',
        top: `calc(${NAV_HEIGHT + GAP}px + var(--pm-banner, 0px))`,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {context}
      </aside>
    </div>
  )
}

/* ─── Piezas de la columna ──────────────────────────────────── */

/* Funciones y no constantes: si el estilo se resolviera al
   importar el módulo, estos paneles se quedarían con los colores
   del tema de arranque y no cambiarían al pasar a claro. */
export function Panel({ title, right, children, pad = 13, onClick }) {
  return (
    <div style={{
      background: theme.card,
      border: `1px solid ${theme.border}`,
      display: 'flex', flexDirection: 'column', minWidth: 0,
    }}>
      {title != null && (
        <div style={{
          borderBottom: `1px solid ${theme.border}`,
          padding: '10px 13px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <span style={css.lbl}>{title}</span>
          {right != null && (
            <span
              onClick={onClick}
              style={{ ...css.lbl, color: theme.accent, cursor: onClick ? 'pointer' : 'default' }}
            >{right}</span>
          )}
        </div>
      )}
      <div style={{ padding: pad, minWidth: 0 }}>{children}</div>
    </div>
  )
}

/* Una cifra suelta con su rótulo. Es la unidad de la columna:
   grande, en mono, y el rótulo pequeño encima. */
export function Figure({ label, value, color, note }) {
  return (
    <div>
      <div style={{ ...css.lbl, fontSize: 8.5 }}>{label}</div>
      <div style={{
        ...css.num, fontSize: 22, fontWeight: 600, lineHeight: 1.1,
        marginTop: 4, color: color || theme.white,
      }}>{value}</div>
      {note && (
        <div style={{
          ...css.lbl, fontSize: 8.5, marginTop: 4,
          textTransform: 'none', letterSpacing: '0.04em',
        }}>{note}</div>
      )}
    </div>
  )
}

/* Fila de la columna: rótulo a la izquierda, cifra a la derecha y
   un filete entre medias. Sirve para cualquier recuento. */
export function Row({ label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 0',
        borderBottom: `1px solid ${theme.border}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ ...css.lbl, fontSize: 9, flex: 1, minWidth: 0 }}>{label}</span>
      <span style={{ ...css.num, fontSize: 13, color: color || theme.white }}>{value}</span>
    </div>
  )
}

/* Lo que hay que mirar hoy. Sin nada que avisar no se pinta el
   panel: una caja vacía ocupa lo mismo que una llena y no dice
   nada. */
export function AttentionList({ items, empty }) {
  if (!items.length) {
    return (
      <p style={{
        ...css.lbl, fontSize: 9.5, textTransform: 'none',
        letterSpacing: '0.04em', color: theme.muted, margin: 0,
      }}>{empty}</p>
    )
  }
  return (
    <div>
      {items.map((it, i) => (
        <div key={it.key ?? i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 9,
          padding: '8px 0',
          borderBottom: i === items.length - 1 ? 'none' : `1px solid ${theme.border}`,
        }}>
          <span style={{
            width: 3, alignSelf: 'stretch', flexShrink: 0,
            background: it.color || theme.accent,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12.5, color: theme.text, fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{it.title}</div>
            {it.sub && <div style={{ ...css.lbl, fontSize: 8.5, marginTop: 2 }}>{it.sub}</div>}
          </div>
          {it.value != null && (
            <span style={{ ...css.num, fontSize: 12, color: it.color || theme.muted, flexShrink: 0 }}>
              {it.value}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
