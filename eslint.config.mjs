import js from '@eslint/js';
export default [
  { ignores: ['**/node_modules/**', '**/.next/**', '.tools/**', '.private-pc-connector/**', '**/__pycache__/**', 'docs/reference/**', '.local-postgres/**', '**/.local-mail/**', 'playwright-report/**', 'test-results/**', '**/*.ts', '**/*.tsx', 'apps/web/public/cinematic-scene.js', 'apps/web/public/earth-renderer.js'] },
  js.configs.recommended,
  { files: ['**/*.js', '**/*.mjs'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: {
    process: 'readonly', console: 'readonly', Buffer: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
    Request: 'readonly', Response: 'readonly', Headers: 'readonly', TextEncoder: 'readonly', TextDecoder: 'readonly',
    ReadableStream: 'readonly', fetch: 'readonly', document: 'readonly', window: 'readonly',
    HTMLElement: 'readonly', HTMLCanvasElement: 'readonly', HTMLInputElement: 'readonly', HTMLSelectElement: 'readonly', HTMLTextAreaElement: 'readonly', NodeFilter: 'readonly', HTMLButtonElement: 'readonly', HTMLFormElement: 'readonly', FormData: 'readonly',
  } } },
];

// Lint the authored scene even though historical React component backups are ignored.
