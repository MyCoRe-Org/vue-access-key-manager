import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), dts()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    rollupOptions: {
      external: function (id) {
        if (
          [
            'vue',
            'vue-i18n',
            'vue-router',
            '@mycore-org/vue-components',
          ].includes(id)
        ) {
          return true;
        }
        if (id.startsWith('@mycore/js-common/')) {
          return true;
        }
        return false;
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
