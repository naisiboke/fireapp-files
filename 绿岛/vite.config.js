import { defineConfig } from 'vite'
import * as uniModule from '@dcloudio/vite-plugin-uni'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

// HBuilderX bundles the plugin as a namespace in some versions, while npm exposes a default function.
const uniFactory = [
  uniModule,
  uniModule.default,
  uniModule.default && uniModule.default.default,
  uniModule.uni,
].find(value => typeof value === 'function')

if (!uniFactory) {
  throw new TypeError('Unable to load @dcloudio/vite-plugin-uni from HBuilderX or npm')
}

export default defineConfig({
  plugins: [
    uniFactory(),
    {
      name: 'fire-app-inline-dynamic-imports',
      apply: 'build',
      enforce: 'post',
      configResolved(config) {
        const platform = String(process.env.UNI_PLATFORM || '').toLowerCase()
        const isApp = platform === 'app'
          || platform === 'app-plus'
          || platform.startsWith('app-')
          || !platform
        if (!isApp) return
        if (!config.build.rollupOptions) config.build.rollupOptions = {}
        const output = config.build.rollupOptions.output
        const patch = (item) => {
          const next = item && typeof item === 'object' ? { ...item } : {}
          next.inlineDynamicImports = true
          if ('manualChunks' in next) delete next.manualChunks
          return next
        }
        if (Array.isArray(output)) {
          config.build.rollupOptions.output = output.map(patch)
        } else {
          config.build.rollupOptions.output = patch(output)
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': projectRoot,
    },
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
  // App 端打包时避免动态依赖被拆分，兼容 HBuilderX 的 IIFE 输出。
  build: {
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
})
