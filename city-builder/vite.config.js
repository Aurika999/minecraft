import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// portul 5174 ca să poată rula în paralel cu Minicraft (5173); host: true = accesibil și de pe telefon
// base: './' = merge și dintr-un subfolder (de exemplu pe GitHub Pages)
export default defineConfig({ base: './', plugins: [react()], server: { port: 5174, host: true }, preview: { port: 4174, host: true } });
