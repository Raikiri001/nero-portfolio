import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// ------------------------------------------------------------------
// Import layering. Each rule is the code-level form of an architecture
// rule in CLAUDE.md ("Conventions → Import layers"). The checks ESLint
// can't express (a unit importing only its own folder + kit/ + frame/)
// live in scripts/check-conventions.mjs.
// ------------------------------------------------------------------
const restrict = (patterns) => ['error', { patterns: patterns.map((p) => ({ caseSensitive: true, ...p })) }]

// Debug routes are reachable only from main.jsx, behind a DEV-only lazy()
const NO_DEBUG_ROUTES = {
  group: ['**/DebugHangar', '**/DebugRoster', '**/DebugOverlay'],
  message: 'Debug routes are dev-only and loaded lazily from src/main.jsx — nothing else imports them.',
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // JSX usage (`<Foo/>`, `<motion.div/>`) counts as a use, so an unused
      // import is a real error — no PascalCase escape hatch.
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': 'error',
      // A component file exports components only (React Fast Refresh)
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      'no-restricted-imports': restrict([NO_DEBUG_ROUTES]),
      'no-restricted-syntax': ['error',
        {
          selector: 'MemberExpression[object.name=/^(sessionStorage|localStorage)$/], MemberExpression[property.name=/^(sessionStorage|localStorage)$/]',
          message: 'Web storage is not a channel between components — pass props / lift state (see App.jsx openProjectId).',
        },
        {
          selector: "CallExpression[callee.name='useFrame'] NewExpression[callee.object.name='THREE']",
          message: 'No allocation inside useFrame — hoist a module-level scratch object.',
        },
      ],
    },
  },
  {
    files: ['src/main.jsx', 'src/game/**/Debug*.jsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Data is the bottom layer: plain values, no UI, no game code.
    files: ['src/data/**'],
    rules: {
      'no-restricted-imports': restrict([NO_DEBUG_ROUTES, {
        regex: '(^|/)(game|components|pages)(/|$)',
        message: 'src/data is the bottom layer — it may not import game/, components/ or pages/.',
      }]),
    },
  },
  {
    // The mech kit is arithmetic with no unit identity.
    files: ['src/game/mech/kit/**'],
    rules: {
      'no-restricted-imports': restrict([NO_DEBUG_ROUTES, {
        regex: '(^|/)(units|frame|hangar|combat|data|components|pages)(/|$)|MechModel3D',
        message: 'kit/ knows nothing about any unit or scene — it may import only three and itself.',
      }]),
    },
  },
  {
    // The combat engine is pure logic: no React, no renderer, no DOM.
    files: ['src/game/combat/combatEngine.js'],
    rules: {
      'no-restricted-imports': restrict([NO_DEBUG_ROUTES, {
        regex: '^(react|react-dom|@react-three/.*)$',
        message: 'combatEngine.js stays pure (state in, state out) — no React or R3F.',
      }]),
    },
  },
  {
    // Pages reach the game only through App's deploy flow.
    files: ['src/pages/**'],
    rules: {
      'no-restricted-imports': restrict([NO_DEBUG_ROUTES, {
        regex: '(^|/)game/(combat/|DeployOverlay$)',
        message: 'Pages never mount the game directly — call onDeploy and forward App\'s `sortie` session to HangarCorridor.',
      }]),
    },
  },
  {
    // Node scripts
    files: ['scripts/**'],
    languageOptions: { globals: globals.node },
  },
])
