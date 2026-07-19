import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte({
      hot: !process.env.VITEST,
    }),
  ],
  envDir: repoRoot,
  envPrefix: ['VITE_', 'PUBLIC_'],
  resolve: {
    conditions: ['browser'],
  },
  ssr: {
    noExternal: ['@eduai/bs-date', 'nepali-datetime'],
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./src/test-setup.ts'],
    env: {
      TZ: 'Asia/Kathmandu',
    },
    server: {
      deps: {
        inline: ['@eduai/bs-date', 'nepali-datetime'],
      },
    },
  },
});
