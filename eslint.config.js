import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
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
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      // ── lo que rompe la aplicación ──
      'no-undef': 'error',
      'react/jsx-uses-vars': 'error',       // sin esto, los componentes usados en JSX parecen no usados
      'react/jsx-uses-react': 'off',        // con el runtime nuevo no hace falta importar React
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

  {
    files: ['test/**/*.{js,jsx}', '**/*.test.{js,jsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
]
