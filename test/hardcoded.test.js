import { describe, it, expect } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'

/* ─────────────────────────────────────────────────────────────
   Nada de texto a pelo en las pantallas.

   Se pidió que TODA cadena visible pase por el diccionario, y aun
   así se habían quedado sueltas unas cuantas: «3 miembros»,
   «Invitar gente», «Intervalo:», el texto de ayuda de los avisos.
   Ninguna daba error: salían en castellano con la aplicación en
   inglés y solo se veían mirando la pantalla.

   Este test lee el código, le quita los comentarios —que sí están
   en castellano, y a propósito— y busca en lo que queda texto de
   interfaz con acentos o con palabras que solo existen en
   castellano. Si algo salta, la solución es una clave nueva en
   strings.js, no una excepción aquí.
   ───────────────────────────────────────────────────────────── */

const RAIZ = process.cwd()

/* El banco de pruebas es de andar por casa y no lo ve ningún
   usuario: ahí el castellano suelto está bien. */
const FUERA = ['strings.js', 'seedStrings.js', 'seedText.js', 'preview.jsx']

/* El nombre de la aplicación no se traduce: es como se llama. */
const MARCA = /^(pibes\s*)?mec[áa]nicos$/i

const PALABRAS = /\b(miembros?|coches?|veh[íi]culos?|talleres?|usuarios?|gente|d[íi]as?|a[ñn]os?|semanas?|gastos?|avisos?|grupos?|pendientes?|creado|eliminar|guardar|cancelar|siguiente|intervalo)\b/i
const ACENTOS = /[áéíóúüñ¿¡]/i

async function ficheros(dir) {
  const out = []
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...await ficheros(p))
    else if (/\.(jsx?|mjs)$/.test(e.name) && !FUERA.includes(e.name)) out.push(p)
  }
  return out
}

/* Los comentarios van en castellano por decisión propia, así que
   se quitan antes de mirar. El salto de línea puede ser \r\n. */
function sinComentarios(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\r\n]*/g, '$1 ')
}

/* Lo que ve un usuario: el texto entre etiquetas y lo que va en
   los atributos que se leen en pantalla. */
function candidatos(src) {
  const out = []
  const limpio = sinComentarios(src)

  for (const m of limpio.matchAll(/>([^<>]{3,120})</g)) {
    const txt = m[1].replace(/\{[^{}]*\}/g, '').trim()
    if (txt) out.push(txt)
  }
  for (const m of limpio.matchAll(/(?:placeholder|title|label|alt)\s*=\s*["']([^"']{3,120})["']/g)) {
    out.push(m[1])
  }
  return out
}

describe('las pantallas no llevan texto suelto en castellano', () => {
  it('todo lo visible pasa por el diccionario', async () => {
    const fuentes = [
      ...await ficheros(path.join(RAIZ, 'src/components')),
      path.join(RAIZ, 'src/App.jsx'),
    ]

    const sueltos = []
    for (const f of fuentes) {
      const src = await fs.readFile(f, 'utf8')
      for (const txt of candidatos(src)) {
        if (MARCA.test(txt.trim())) continue
        if (ACENTOS.test(txt) || PALABRAS.test(txt)) {
          sueltos.push(`${path.relative(RAIZ, f)}: «${txt}»`)
        }
      }
    }

    expect(sueltos).toEqual([])
  })
})
