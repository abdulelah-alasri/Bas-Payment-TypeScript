import { defineConfig, loadEnv } from 'vite'

/**
 * Dev proxy: browser calls same-origin `/api/...` → forwarded to Bas API.
 * Avoids CORS (API allows only specific origins like bas-pay-dev.web.app).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    env.VITE_PROXY_API_TARGET?.trim() || 'https://api-tst.basgate.com'

  return {
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    preview: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
