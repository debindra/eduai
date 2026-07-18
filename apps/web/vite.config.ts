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
});
