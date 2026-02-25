import { defineConfig } from 'vite';
import path from 'path';
import * as fs from 'fs';

const copyAssetsPlugin = () => ({
  name: 'copy-assets',
  closeBundle() {
    const srcDir = path.resolve(__dirname, 'electron/assets');
    const destDir = path.resolve(__dirname, '.vite/build/assets');
    if (fs.existsSync(srcDir)) {
      fs.cpSync(srcDir, destDir, { recursive: true });
    }
  },
});

export default defineConfig({
  plugins: [copyAssetsPlugin()],
  build: {
    outDir: '.vite/build',
    lib: {
      entry: 'electron/main.ts',
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: [
        'electron',
        'electron-log',
        'ffmpeg-static',
        'ffprobe-static',
        'path',
        'fs',
      ],
    },
    minify: false,
    emptyOutDir: false,
  },
  resolve: {
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
});
