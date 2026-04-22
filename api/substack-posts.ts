import { fetchSubstackPosts } from '../server/substack.js'

type ApiResponse = {
  setHeader: (name: string, value: string) => void
  status: (statusCode: number) => { json: (payload: unknown) => void }
}

export default async function handler(_req: unknown, res: ApiResponse) {
  try {
    const posts = await fetchSubstackPosts()

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600')
    res.status(200).json({ posts })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Substack fetch error'
    res.status(500).json({ error: message })
  }
}
