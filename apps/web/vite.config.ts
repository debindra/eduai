import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  envDir: repoRoot,
  envPrefix: ['VITE_', 'PUBLIC_'],
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
  },
  // @eduai/bs-date is a linked workspace package shipped as CommonJS (it is
  // also consumed by the CJS NestJS API). Linked deps are not pre-bundled by
  // default, so force esbuild/Rollup to convert its CJS (and its nepali-datetime
  // dependency) to browser-safe ESM for both dev and build.
  optimizeDeps: {
    include: ['@eduai/bs-date'],
  },
  build: {
    commonjsOptions: {
      include: [/bs-date/, /nepali-datetime/, /node_modules/],
    },
  },
});
