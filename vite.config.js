import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

/* GitHub Pages no conoce las rutas de la aplicación: al pedir /demo
   busca un fichero que no existe y devuelve su 404. El truco estándar
   es publicar un 404.html idéntico al index, de modo que Pages lo
   sirva y la aplicación resuelva la ruta por su cuenta.

   En local no hace falta: el servidor de Vite ya devuelve el index
   para cualquier ruta. */
function spaFallback() {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      const out = resolve(__dirname, 'dist')
      copyFileSync(resolve(out, 'index.html'), resolve(out, '404.html'))
    },
  }
}

export default defineConfig({
  plugins: [react(), spaFallback()],
  // Base '/' porque el repositorio es usuario.github.io
  base: '/',
})
