import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills';
// import { fileURLToPath } from 'node:url'
// import rollupNodePolyFill  from "rollup-plugin-node-polyfills";


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: [
        'os',
        'fs',
        'buffer',
        'crypto',
        'http',
        'https',
        'net',
        'module',
        'vm',
        'constants',
        'url',
        'path',
        'stream',
        'child_process',
        'zlib',
      ]
    })
  ],
  //   nodePolyfills({
  //     include: []
  //   })
  // ],
  // optimizeDeps: {
  //   esbuildOptions: {
  //     define: {
  //       global: 'globalThis'
  //     }
  //   }
  // },
  build: {
    rollupOptions: {
      external: ['fs/promises']
    }
  },
  resolve: {
    alias: {
      "./runtimeConfig": "./runtimeConfig.browser",
    },
  }
  // resolve: {
  //   alias: {
  //     "@": fileURLToPath(new URL("./src", import.meta.url)),
  //     './runtimeConfig': './runtimeConfig.browser',
  //   },
  // }
})
