import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Only bake a Gemini key into the bundle for local development. Production
    // bundles must never ship a key: buyers paste their own in Settings.
    const devGeminiKey = mode === 'development' ? (env.GEMINI_API_KEY || '') : '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(devGeminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(devGeminiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
