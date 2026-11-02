import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// portul 5174 ca să poată rula în paralel cu Minicraft (5173); host: true = accesibil și de pe telefon
export default defineConfig({ plugins: [react()], server: { port: 5174, host: true } });
