import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';

export default {
  packagerConfig: {
    name: 'ClipUp',
    executableName: 'ClipUp',
    asar: {
      unpack: 'build/assets/**/*',
    },
    extraResource: [
      './node_modules/ffmpeg-static/ffmpeg.exe',
      './node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe',
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'ClipUp',
    }),
    new MakerZIP({}, ['win32', 'darwin']),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'electron/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'electron/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};
