import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import unusedImports from 'eslint-plugin-unused-imports'; // tambah ini

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', '.open-next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    plugins: {
      'unused-imports': unusedImports, // tambah ini
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'off',
      'react-compiler/react-no-impure-function-during-render': 'off',
      'react-compiler/react-no-refs-during-render': 'off',
      'react-compiler/react-no-infinite-loops': 'off',

      // tambah rules ini
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
]);

export default eslintConfig;
