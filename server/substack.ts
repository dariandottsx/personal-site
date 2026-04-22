export type SubstackPost = {
  id: string
  title: string
  href: string
  image?: string
}

const SUBSTACK_BASE_URL = 'https://dariansdrafts.substack.com'
const SUBSTACK_RSS_TO_JSON_URL = 'https://api.rss2json.com/v1/api.json'
const REQUEST_TIMEOUT_MS = 7000
const MAX_POSTS = 6

type ArchiveItem = {
  id: number
  title: string
  canonical_url?: string
  post_date: string
  cover_image?: string
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

const parseHtmlImage = (html: string) => html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]

const sortByNewest = <T extends { sortTime: number }>(items: T[]) =>
  items.slice().sort((a, b) => b.sortTime - a.sortTime)

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
  const loadFromArchive = async () => {
    const archiveUrl = `${SUBSTACK_BASE_URL}/api/v1/archive?sort=new`
    const response = await fetchWithTimeout(archiveUrl)

    if (!response.ok) {
      throw new Error(`Substack archive request failed: ${response.status}`)
    }

    const archiveItems = (await response.json()) as ArchiveItem[]
    const recentItems = archiveItems
      .map((item) => ({
        ...item,
        sortTime: new Date(item.post_date).getTime() || 0
      }))
      .filter((item) => item.title)
      .sort((a, b) => b.sortTime - a.sortTime)
      .slice(0, MAX_POSTS)

    const imageResults = await Promise.all(
      recentItems.map(async (item) => {
        const href = item.canonical_url ?? `${SUBSTACK_BASE_URL}/p/${item.id}`
        const ogImage = await fetchImageForPost(href)

        return {
          id: String(item.id),
          title: decodeHtml(item.title),
          href,
          // Prefer page OG image, fallback to archive-provided cover image.
          image: ogImage || item.cover_image
        } satisfies SubstackPost
      })
    )

    return imageResults
  }

  const loadFromRssFallback = async () => {
    const rssUrl = encodeURIComponent(`${SUBSTACK_BASE_URL}/feed`)
    const response = await fetchWithTimeout(`${SUBSTACK_RSS_TO_JSON_URL}?rss_url=${rssUrl}`)
    if (!response.ok) {
      throw new Error(`RSS fallback request failed: ${response.status}`)
    }

    const payload = (await response.json()) as {
      items?: Array<{
        guid?: string
        title?: string
        pubDate?: string
        link?: string
        thumbnail?: string
        description?: string
      }>
    }

    if (!payload.items || payload.items.length === 0) {
      throw new Error('No RSS items found.')
    }

    return sortByNewest(
      payload.items.map((item, index) => ({
        sortTime: new Date(item.pubDate ?? '').getTime() || 0,
        id: item.guid || item.link || `rss-${index}`,
        title: decodeHtml(item.title ?? ''),
        href: item.link ?? SUBSTACK_BASE_URL,
        image: item.thumbnail || parseHtmlImage(item.description ?? '')
      }))
    )
      .filter((post) => post.title && post.href)
      .slice(0, MAX_POSTS)
      .map(({ sortTime: _sortTime, ...post }) => post)
  }

  try {
    return await loadFromArchive()
  } catch {
    return loadFromRssFallback()
  }
}
