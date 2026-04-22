export type SubstackPost = {
  id: string
  title: string
  href: string
  image?: string
}

const SUBSTACK_BASE_URL = 'https://dariansdrafts.substack.com'
const REQUEST_TIMEOUT_MS = 7000
const MAX_POSTS = 6

type ArchiveItem = {
  id: number
  title: string
  canonical_url?: string
  post_date: string
}

const decodeHtml = (value: string) =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()

const fetchWithTimeout = async (url: string, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
      }
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

const parseMetaImage = (html: string) => {
  const ogImage =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i)?.[1]

  if (ogImage) return ogImage

  const twitterImage =
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i)?.[1]

  if (twitterImage) return twitterImage

  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
}

const fetchImageForPost = async (href: string) => {
  try {
    const response = await fetchWithTimeout(href)
    if (!response.ok) return undefined
    const html = await response.text()
    if (!html) return undefined
    return parseMetaImage(html)
  } catch {
    return undefined
  }
}

export const fetchSubstackPosts = async (): Promise<SubstackPost[]> => {
  const archiveUrl = `${SUBSTACK_BASE_URL}/api/v1/archive?sort=new`
  const response = await fetchWithTimeout(archiveUrl)

  if (!response.ok) {
    throw new Error(`Substack archive request failed: ${response.status}`)
  }

  const archiveItems = (await response.json()) as ArchiveItem[]
  const recentItems = archiveItems
    .slice()
    .sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime())
    .slice(0, MAX_POSTS)

  const imageResults = await Promise.all(
    recentItems.map(async (item) => {
      const href = item.canonical_url ?? `${SUBSTACK_BASE_URL}/p/${item.id}`
      const image = await fetchImageForPost(href)

      return {
        id: String(item.id),
        title: decodeHtml(item.title),
        href,
        image
      } satisfies SubstackPost
    })
  )

  return imageResults
}
