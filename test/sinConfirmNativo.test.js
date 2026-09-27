import { describe, it, expect } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'

/* ─────────────────────────────────────────────────────────────
   Ni un confirm() del navegador en las pantallas

   Se cambiaron doce por el modal de la casa… y se quedó uno: el
   del botón de encender el modo mantenimiento, porque la línea era
   `if (encender && !confirm(...))` y la búsqueda iba a por
   `if (!confirm(`. Se descubrió encendiendo la web de verdad: el
   diálogo del sistema aparece justo en la acción más delicada.

   Este test lee el código y no deja pasar ninguno. La única
   excepción es ui.jsx, que es donde vive el respaldo para cuando
   no hay proveedor (tests y banco de pruebas).
   ───────────────────────────────────────────────────────────── */

const RAIZ = process.cwd()
const EXCEPCION = 'ui.jsx'

async function ficheros(dir) {
  const out = []
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...await ficheros(p))
    else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p)
  }
  return out
}

/* Los comentarios hablan del confirm() del navegador a propósito,
   así que se quitan antes de mirar. */
function sinComentarios(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\r\n]*/g, '$1 ')
}

describe('preguntar «¿seguro?»', () => {
  it('no queda ni un confirm() del navegador', async () => {
    const fuentes = [
      ...await ficheros(path.join(RAIZ, 'src/components')),
      ...await ficheros(path.join(RAIZ, 'src/lib')),
      path.join(RAIZ, 'src/App.jsx'),
    ].filter(f => path.basename(f) !== EXCEPCION)

    const sueltos = []
    for (const f of fuentes) {
      const src = sinComentarios(await fs.readFile(f, 'utf8'))
      /* Cualquier confirm( que no sea una llamada a nuestro
         confirmar() ni el propio useConfirm. */
      for (const m of src.matchAll(/(^|[^.\w])confirm\s*\(/g)) {
        const linea = src.slice(0, m.index).split('\n').length
        sueltos.push(`${path.relative(RAIZ, f)}:${linea}`)
      }
    }

    expect(sueltos).toEqual([])
  })

  it('el respaldo sigue estando en ui.jsx, que es su sitio', async () => {
    const src = await fs.readFile(path.join(RAIZ, 'src/components/ui.jsx'), 'utf8')
    expect(src).toContain('window.confirm')
  })
})
