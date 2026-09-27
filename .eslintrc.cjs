module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  settings: { react: { version: '18.3' } },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.node.json', './tsconfig.app.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['react-refresh', 'react'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    ...require('eslint-plugin-react').configs.recommended.rules,
    ...require('eslint-plugin-react').configs['jsx-runtime'].rules,
  },
};
