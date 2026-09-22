import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset paths so the static bundle works from any subpath
  // (e.g. GitHub Pages serves from /<repo>/).
  base: './',
});
