import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'

/* ─────────────────────────────────────────────────────────────
   Reglas de análisis estático

   Están aquí por dos fallos concretos que llegaron a producción:

   · «COLORS is not defined» y «colors is not defined». Vite compila
     sin comprobar identificadores, así que la pantalla revienta al
     abrirla, no al construir. Lo caza no-undef, que hace análisis
     de ámbito de verdad y no depende de que el nombre vaya en
     mayúsculas.

   · «Rendered more hooks than during the previous render», por un
     hook colocado después de un return temprano. Lo caza
     rules-of-hooks.

   Ya no hace falta eslint-plugin-react: desde eslint 10 el propio
   análisis de ámbito cuenta como usado un componente que solo
   aparece en JSX, que era lo único que se le pedía
   (react/jsx-uses-vars). Además el plugin no admite eslint 10.

   El resto se deja en aviso: el objetivo es que los errores sean
   errores de verdad, no una lista de mil quejas de estilo que se
   acaba ignorando.
   ───────────────────────────────────────────────────────────── */

export default [
  { ignores: ['dist/**', 'node_modules/**'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // ── lo que rompe la aplicación ──
      'no-undef': 'error',
      'react-hooks/rules-of-hooks': 'error',

      // ── avisos útiles, no bloqueantes ──
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^_', argsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  /* La configuración de Vite corre en Node, no en el navegador: ahí
     sí existe __dirname (Vite se lo da al compilarla). */
  {
    files: ['vite.config.js', 'vitest.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    files: ['test/**/*.{js,jsx}', '**/*.test.{js,jsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
]
