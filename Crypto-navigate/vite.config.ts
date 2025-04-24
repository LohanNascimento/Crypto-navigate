import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    nodePolyfills({
      protocolImports: true,
      // Habilita polyfills mais completos
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Polyfills para módulos do Node.js
      "node:net": path.resolve(__dirname, "./src/vite-ccxt-polyfills.js"),
      "net": path.resolve(__dirname, "./src/vite-ccxt-polyfills.js"),
      "http-proxy-agent": path.resolve(__dirname, "./src/vite-ccxt-polyfills.js"),
      "https-proxy-agent": path.resolve(__dirname, "./src/vite-ccxt-polyfills.js"),
      "socks-proxy-agent": path.resolve(__dirname, "./src/vite-ccxt-polyfills.js"),
      // O arquivo problemático específico
      "node_modules/ccxt/js/src/static_dependencies/node-fetch/utils/referrer.js": path.resolve(__dirname, "./src/vite-ccxt-polyfills.js"),
      // Outros módulos do Node.js
      "tls": path.resolve(__dirname, "./src/vite-ccxt-polyfills.js"),
      "fs": path.resolve(__dirname, "./src/vite-ccxt-polyfills.js"),
      "crypto": "crypto-browserify",
      "stream": "stream-browserify",
      "zlib": "browserify-zlib",
    },
  },
  optimizeDeps: {
    // Excluir ccxt da otimização de dependências
    exclude: ['ccxt'],
    esbuildOptions: {
      // Define global variables for CCXT
      define: {
        'process.env.NODE_DEBUG': 'false',
        'global': 'globalThis'
      },
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // Tratar CCXT como external para evitar problemas de build
      external: ['ccxt'],
      output: {
        // Fornecer global para CCXT quando carregado como script externo
        globals: {
          ccxt: 'ccxt'
        }
      },
      // Ignorar warnings para referências circulares
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      },
    },
  },
}));
