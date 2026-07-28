import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
// server/core.mjs is intentionally plain ESM so production can run without extra dependencies.
// @ts-ignore JavaScript runtime module has no declaration file.
import { createApiHandler } from './server/core.mjs'

function promptWordsApi(): Plugin {
  return {
    name: 'prompt-words-api',
    configureServer(server) {
      server.middlewares.use(createApiHandler())
    },
  }
}

export default defineConfig({
  plugins: [react(), promptWordsApi()],
})
