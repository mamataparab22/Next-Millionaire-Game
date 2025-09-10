/* Root ESLint config applies to all packages. Individual packages can extend/override as needed. */
/* eslint-env node */
module.exports = {
  root: true,
  ignorePatterns: ['**/dist/**', '**/build/**', 'node_modules/**'],
  env: { es2022: true, browser: true, node: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y', 'import'],
  extends: [
    'standard-with-typescript',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: [
      './apps/web/tsconfig.json',
    ],
    tsconfigRootDir: __dirname,
  },
  settings: { react: { version: 'detect' } },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off',
  },
}
