import { defineConfig } from 'vite';

export default defineConfig({
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
