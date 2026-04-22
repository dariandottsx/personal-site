import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchSubstackPosts } from './server/substack'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    {
      name: 'substack-api-dev-endpoint',
      configureServer(server) {
        server.middlewares.use('/api/substack-posts', async (_req, res) => {
          try {
            const posts = await fetchSubstackPosts()
            const payload = JSON.stringify({ posts })

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.end(payload)
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Failed to fetch Substack posts'

            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: message }))
          }
        })
      },
    },
  ],
})
