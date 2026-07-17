import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  envPrefix: ['VITE_', 'PUBLIC_'],
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
  },
});
