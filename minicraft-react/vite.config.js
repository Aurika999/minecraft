import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// host: true face serverul accesibil și de pe telefon, din aceeași rețea Wi-Fi
export default defineConfig({ plugins: [react()], server: { host: true } });
