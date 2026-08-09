// Flat ESLint-config (ESLint 9 + eslint-config-next 16, som er flat-native —
// ingen FlatCompat-bro trengs).
//
// Repoet hadde `eslint-disable-next-line react-hooks/exhaustive-deps`-kommentarer
// i sju filer UTEN at eslint var installert — de var altså rene kommentarer og
// vernet ingenting. Denne konfigen gjør dem ekte igjen: bevisst smale
// avhengighetslister er nå både dokumentert OG håndhevet.
//
// Regelsettet er Nexts anbefalte core-web-vitals + TypeScript-oppsett. Der en
// standardregel bare gir stilstøy (og ville tvunget fram stor, risikofri
// kodekverning) skrus den ned i stedet — begrunnelse står ved hver regel.

import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

export default [
  {
    ignores: ['.next/**', '.open-next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // `any` brukes i et fåtall skjøter mot VexFlow/Tone.js, som ikke har
      // brukbare typer. `tsc --noEmit` (strict) er sannhetskilden for typer
      // her; regelen ville bare duplisert støyen med svakere signal.
      '@typescript-eslint/no-explicit-any': 'off',

      // Ubrukte variabler er en EKTE feil og skal stoppe CI — men `_`-prefiks
      // er den etablerte måten å si «bevisst ignorert» på (destrukturering,
      // kataloger av hendelses-callbacks).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // ── React Compiler-reglene (nye i eslint-plugin-react-hooks v7) ─────────
      // Appen kompileres IKKE med React Compiler, så garantiene disse reglene
      // håndhever gjelder ikke her — og mønstrene de flagger er bevisste og
      // gjennomtestede: ref-speiling av ferske props inn i lydmotorens
      // callbacks (`refs`), og hydrerings-effekter som leser sessionStorage før
      // første maling (`set-state-in-effect`). Å «rette» dem ville betydd en
      // omskriving av avspillings- og hydreringslaget uten en eneste kjent feil
      // å vise til. De klassiske reglene `rules-of-hooks` og `exhaustive-deps`
      // står igjen som feil/advarsel — det er DE som fanger ekte bugs.
      //
      // Resten av compiler-familien (purity, immutability, globals, …) er
      // fortsatt PÅ: de fyrer ikke i dag og fungerer som vakt på ny kode.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
]
