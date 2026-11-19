import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
    extensions: [
      '.web.mjs',
      '.web.js',
      '.web.jsx',
      '.mjs',
      '.js',
      '.jsx',
      '.json',
    ],
  },
  server: {
    port: 5173,
    host: true,
  },
  define: {
    global: 'window',
    __DEV__: JSON.stringify(true),
  },
});
