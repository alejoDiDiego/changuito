import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ ignores: ['node_modules/**', 'vendor/**', '.bootstrap/**', 'public/build/**', 'bootstrap/ssr/**'] }, js.configs.recommended, ...ts.configs.recommended, { languageOptions: { globals: { process: 'readonly' } } });
