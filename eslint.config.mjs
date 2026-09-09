import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      // Payload generates or dictates these verbatim. Linting tool output only
      // produces warnings nobody can act on without breaking the tool.
      'src/payload/migrations/**',
      'src/payload/payload-types.ts',
      'src/app/(payload)/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // Server actions must accept (previousState, formData) whether or not they
      // use both. An underscore prefix is how the code says "required, unused".
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
]

export default config
