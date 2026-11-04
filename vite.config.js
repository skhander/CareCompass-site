import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

/** Serve /page → page.html (and nested paths) so clean Netlify-style URLs work locally. */
function cleanHtmlUrls() {
  return {
    name: 'clean-html-urls',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (!req.url || req.method !== 'GET' && req.method !== 'HEAD') return next()
        const [pathname, query = ''] = req.url.split('?')
        if (!pathname || pathname.includes('.') || pathname.endsWith('/')) return next()
        const candidate = path.join(server.config.root, pathname.slice(1) + '.html')
        if (fs.existsSync(candidate)) {
          req.url = pathname + '.html' + (query ? `?${query}` : '')
        }
        next()
      })
    },
  }
}

export default defineConfig({
  root: '.',
  plugins: [cleanHtmlUrls()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
  },
})
