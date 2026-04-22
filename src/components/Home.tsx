import { useEffect, useMemo, useState } from 'react'

type BlogPost = {
  id: string
  title: string
  excerpt: string
  dateLabel: string
  href: string
  image?: string
}

const SUBSTACK_BASE_URL = 'https://dariansdrafts.substack.com'
const SUBSTACK_RSS_TO_JSON_URL = 'https://api.rss2json.com/v1/api.json'
const CORS_PROXY_URL = 'https://api.allorigins.win/raw?url='
const BLOG_CACHE_KEY = 'substack_posts_cache_v3'
const BLOG_CACHE_TTL_MS = 1000 * 60 * 20
const BLOG_FETCH_TIMEOUT_MS = 2500

const Home = () => {
  const [copied, setCopied] = useState(false)
  const [hoveredSocial, setHoveredSocial] = useState<string | null>(null)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [blogError, setBlogError] = useState<string | null>(null)
  const [isLoadingBlog, setIsLoadingBlog] = useState(true)

  const socials = [
    { label: 'GitHub', href: 'https://github.com/dariandottsx' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/darianpan/' },
    { label: 'X/Twitter', href: 'https://x.com/darian_pan' },
    { label: 'Instagram', href: 'https://www.instagram.com/dariandidwhat/' },
    { label: 'Podcast', href: 'https://podcasts.apple.com/us/podcast/truetalks/id1489817610' }
  ]

  const achievements = [
    'Built my first invention at age 8',
    'Started a YouTube channel and podcast at age 10',
    'Won national martial arts gold at 14, then again at 15 and 16',
    'Scaled a dropshipping store to five figures at 14',
    'Built a global nonprofit serving 28 countries at 15',
    'Published both a book and a research paper at 16',
    'Launched two micro-startups at 16',
    'Hosted weekly builder events since 17',
    'Did engineering work for 6 startups at 18',
    'Did design work for 2 startups at 18'
  ]

  const createRandomStar = (id: number) => {
    const size = Math.random() > 0.75 ? 2 : 1
    return {
      id,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size,
      duration: 3.6 + Math.random() * 5.4,
      delay: Math.random() * 5,
      animationName: Math.random() > 0.5 ? 'starBobA' : 'starBobB',
      color: Math.random() > 0.35 ? '#ffffff' : '#dbeafe'
    }
  }

  const stars = useMemo(
    () => Array.from({ length: 150 }, (_, index) => createRandomStar(index)),
    []
  )

  useEffect(() => {
    const publicationOrigin = SUBSTACK_BASE_URL.replace(/\/$/, '')

    type CachedBlogPayload = {
      fetchedAt: number
      posts: BlogPost[]
    }

    const normalizeTitle = (value: string) =>
      value
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim()

    const normalizeText = (value: string) =>
      value
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim()

    const formatDateLabel = (dateValue: string) => {
      const parsedDate = new Date(dateValue)
      if (Number.isNaN(parsedDate.getTime())) return ''
      return parsedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    const parseHtmlImage = (html: string) => {
      const srcMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
      return srcMatch?.[1]
    }

    const parseMetaImage = (html: string) => {
      const ogImage =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1] ??
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i)?.[1]

      if (ogImage) return ogImage

      const twitterImage =
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1] ??
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i)?.[1]

      return twitterImage
    }

    const getNodeText = (node: Element, tagName: string) => {
      const match = node.getElementsByTagName(tagName)[0]
      return match?.textContent ?? ''
    }

    const extractImageFromItemNode = (node: Element, description: string) => {
      const mediaContent = node.getElementsByTagName('media:content')[0]?.getAttribute('url')
      const mediaThumbnail = node.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url')
      const enclosure = node.getElementsByTagName('enclosure')[0]?.getAttribute('url')
      const contentEncoded = getNodeText(node, 'content:encoded')
      const imageFromEncoded = parseHtmlImage(contentEncoded)
      const imageFromDescription = parseHtmlImage(description)

      return mediaContent || mediaThumbnail || enclosure || imageFromEncoded || imageFromDescription
    }

    const toTimestamp = (dateValue: string) => {
      const parsed = new Date(dateValue).getTime()
      return Number.isNaN(parsed) ? 0 : parsed
    }

    const fetchWithTimeout = async (url: string, timeoutMs = BLOG_FETCH_TIMEOUT_MS) => {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

      try {
        return await fetch(url, { signal: controller.signal })
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    const loadFromRssXml = async () => {
      const rssUrl = `${publicationOrigin}/feed`
      const proxiedRssUrl = `${CORS_PROXY_URL}${encodeURIComponent(rssUrl)}`
      const response = await fetchWithTimeout(proxiedRssUrl)
      if (!response.ok) throw new Error('RSS proxy request failed.')

      const xmlText = await response.text()
      if (!xmlText) throw new Error('RSS proxy returned empty response.')

      const parser = new DOMParser()
      const xmlDocument = parser.parseFromString(xmlText, 'application/xml')
      const parseError = xmlDocument.querySelector('parsererror')
      if (parseError) throw new Error('Could not parse RSS feed XML.')

      const itemNodes = Array.from(xmlDocument.querySelectorAll('item')).slice(0, 6)
      if (itemNodes.length === 0) throw new Error('No RSS items found from proxy.')

      const parsedPosts = itemNodes.map((node, index) => {
        const title = getNodeText(node, 'title')
        const link = getNodeText(node, 'link')
        const pubDate = getNodeText(node, 'pubDate')
        const description = getNodeText(node, 'description')
        const image = extractImageFromItemNode(node, description)

        return {
          sortTime: toTimestamp(pubDate),
          id: getNodeText(node, 'guid') || `${link}-${index}`,
          title: normalizeTitle(title),
          excerpt: normalizeText(description),
          dateLabel: formatDateLabel(pubDate),
          href: link,
          image
        }
      })

      return parsedPosts
        .filter((post) => post.title && post.href)
        .sort((a, b) => b.sortTime - a.sortTime)
        .slice(0, 6)
        .map(({ sortTime: _sortTime, ...post }) => post)
    }

    const loadFromRssJson = async () => {
      const rssUrl = encodeURIComponent(`${publicationOrigin}/feed`)
      const response = await fetchWithTimeout(`${SUBSTACK_RSS_TO_JSON_URL}?rss_url=${rssUrl}`)
      if (!response.ok) throw new Error('RSS fallback request failed.')

      const payload = (await response.json()) as {
        items?: Array<{
          guid: string
          title: string
          pubDate: string
          link: string
          description?: string
          thumbnail?: string
        }>
      }

      if (!payload.items || payload.items.length === 0) {
        throw new Error('No RSS items found.')
      }

      const parsedItems = payload.items
        .map((item) => ({
          sortTime: toTimestamp(item.pubDate),
          id: item.guid || item.link,
          title: normalizeTitle(item.title),
          excerpt: normalizeText(item.description ?? ''),
          dateLabel: formatDateLabel(item.pubDate),
          href: item.link,
          image: item.thumbnail || parseHtmlImage(item.description ?? '')
        }))
        .sort((a, b) => b.sortTime - a.sortTime)
        .slice(0, 6)
        .map(({ sortTime: _sortTime, ...post }) => post)

      return parsedItems
    }

    const resolvePostImageFromPage = async (postUrl: string) => {
      const proxiedPostUrl = `${CORS_PROXY_URL}${encodeURIComponent(postUrl)}`
      const response = await fetchWithTimeout(proxiedPostUrl)
      if (!response.ok) throw new Error('Post page fetch failed.')

      const html = await response.text()
      if (!html) return undefined

      return parseMetaImage(html) || parseHtmlImage(html)
    }

    const enrichPostsWithPageImages = async (posts: BlogPost[]) => {
      const postsToCheck = posts.slice(0, 6)
      if (postsToCheck.length === 0) return posts

      const imageResults = await Promise.all(
        postsToCheck.map(async (post) => {
          try {
            const image = await resolvePostImageFromPage(post.href)
            return { id: post.id, image }
          } catch {
            return { id: post.id, image: undefined }
          }
        })
      )

      const imageById = new Map(imageResults.map((item) => [item.id, item.image]))

      return posts.map((post) => ({
        ...post,
        image: imageById.get(post.id) || post.image
      }))
    }

    const readCachedPosts = () => {
      try {
        const rawValue = localStorage.getItem(BLOG_CACHE_KEY)
        if (!rawValue) return null

        const parsed = JSON.parse(rawValue) as CachedBlogPayload
        if (!Array.isArray(parsed.posts) || typeof parsed.fetchedAt !== 'number') return null

        return parsed
      } catch {
        return null
      }
    }

    const writeCachedPosts = (posts: BlogPost[]) => {
      try {
        const payload: CachedBlogPayload = { posts, fetchedAt: Date.now() }
        localStorage.setItem(BLOG_CACHE_KEY, JSON.stringify(payload))
      } catch {
        // Ignore storage write failures.
      }
    }

    const firstSuccessful = async <T,>(jobs: Array<() => Promise<T>>) =>
      new Promise<T>((resolve, reject) => {
        let rejections = 0

        jobs.forEach((job) => {
          job()
            .then((value) => resolve(value))
            .catch(() => {
              rejections += 1
              if (rejections === jobs.length) {
                reject(new Error('All feed sources failed.'))
              }
            })
        })
      })

    const loadPosts = async () => {
      const cached = readCachedPosts()
      const isCacheFresh = cached ? Date.now() - cached.fetchedAt < BLOG_CACHE_TTL_MS : false

      if (cached?.posts?.length) {
        setBlogPosts(cached.posts)
        setIsLoadingBlog(false)
      } else {
        setIsLoadingBlog(true)
      }

      setBlogError(null)

      if (isCacheFresh) return

      try {
        const freshPosts = await firstSuccessful<BlogPost[]>([loadFromRssXml, loadFromRssJson])
        const postsWithImages = await enrichPostsWithPageImages(freshPosts)
        setBlogPosts(postsWithImages)
        writeCachedPosts(postsWithImages)
      } catch {
        if (!cached?.posts?.length) {
          setBlogError('Could not load Substack posts right now.')
        }
      } finally {
        setIsLoadingBlog(false)
      }
    }

    loadPosts()
  }, [])

  return (
    <>
      <style>
        {`
          @keyframes twinkle {
            0%, 100% { opacity: 0.45; }
            50% { opacity: 1; }
          }

          @keyframes starBobA {
            0% {
              transform: translate3d(0, 8px, 0);
              opacity: 0.24;
            }
            50% {
              transform: translate3d(0, -10px, 0);
              opacity: 0.95;
            }
            100% {
              transform: translate3d(0, 8px, 0);
              opacity: 0.24;
            }
          }

          @keyframes starBobB {
            0% {
              transform: translate3d(0, 10px, 0);
              opacity: 0.18;
            }
            50% {
              transform: translate3d(0, -12px, 0);
              opacity: 0.9;
            }
            100% {
              transform: translate3d(0, 10px, 0);
              opacity: 0.18;
            }
          }

          @keyframes nebulaDrift {
            0% {
              transform: translate3d(0, 0, 0) scale(1);
              opacity: 0.95;
            }
            50% {
              transform: translate3d(-120px, 86px, 0) scale(1.1);
              opacity: 1;
            }
            100% {
              transform: translate3d(108px, -80px, 0) scale(1.03);
              opacity: 0.88;
            }
          }

        `}
      </style>
      <main
        aria-label="Animated space background"
        style={{
          minHeight: '100svh',
          width: '100%',
          position: 'relative',
          display: 'block',
          overflow: 'hidden',
          cursor: 'default',
          background:
            'radial-gradient(circle at 50% 35%, #040a19 0%, #01030a 42%, #000001 100%)'
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 25%, rgba(99,102,241,0.13), transparent 28%), radial-gradient(circle at 75% 30%, rgba(59,130,246,0.12), transparent 33%), radial-gradient(circle at 55% 75%, rgba(56,189,248,0.1), transparent 28%)',
            filter: 'blur(42px)',
            animation: 'nebulaDrift 34s ease-in-out infinite alternate',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />
        <div
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
        >
          {stars.map((star) => (
            <span
              key={star.id}
              style={{
                position: 'absolute',
                display: 'block',
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                borderRadius: '9999px',
                background: star.color,
                opacity: 0.35,
                boxShadow: `0 0 ${star.size === 2 ? '8px' : '5px'} ${star.color}`,
                animation: `${star.animationName} ${star.duration}s ease-in-out ${star.delay}s infinite`
              }}
            />
          ))}
        </div>
        <section
          style={{
            position: 'relative',
            zIndex: 60,
            isolation: 'isolate',
            padding: '2.5rem 2rem 3rem',
            maxWidth: '52rem',
            margin: '0 auto',
            textAlign: 'center'
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(2.2rem, 6.2vw, 4.25rem)',
              lineHeight: 0.95,
              letterSpacing: '-0.04em',
              color: '#f8fafc',
              fontWeight: 700
            }}
          >
            <span>darian </span>
            <span
              style={{
                background: 'rgba(255,255,255,0.16)',
                padding: '0.06em 0.13em 0.08em'
              }}
            >
              pan
            </span>
          </h1>
          <p
            style={{
              margin: '1rem 0 0',
              color: 'rgba(241,245,249,0.9)',
              fontSize: 'clamp(1rem, 1.8vw, 1.45rem)',
              letterSpacing: '-0.02em',
              fontWeight: 600
            }}
          >
            19 y/o developer building the future of film.
          </p>
          <nav
            aria-label="Social links"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0.9rem',
              marginTop: '1.8rem'
            }}
          >
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setHoveredSocial(social.label)}
                onMouseLeave={() => setHoveredSocial(null)}
                style={{
                  color:
                    hoveredSocial === social.label
                      ? 'rgba(255,255,255,1)'
                      : 'rgba(226,232,240,0.9)',
                  textDecoration: 'none',
                  fontSize: 'clamp(0.95rem, 1.35vw, 1.25rem)',
                  letterSpacing: '-0.02em',
                  padding: '0.6rem 0.7rem',
                  margin: '-0.6rem -0.7rem',
                  transform:
                    hoveredSocial === social.label ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center',
                  transition: 'transform 140ms ease, color 140ms ease',
                  cursor: 'pointer'
                }}
              >
                {social.label}
              </a>
            ))}
            <button
              type="button"
              onMouseEnter={() => setHoveredSocial('Copy email')}
              onMouseLeave={() => setHoveredSocial(null)}
              onClick={async () => {
                await navigator.clipboard.writeText('dp667@cornell.edu')
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '0.75rem 0.95rem',
                margin: '-0.75rem -0.95rem',
                color:
                  copied || hoveredSocial === 'Copy email'
                    ? 'rgba(255,255,255,1)'
                    : 'rgba(226,232,240,0.9)',
                fontSize: 'clamp(0.95rem, 1.35vw, 1.25rem)',
                letterSpacing: '-0.02em',
                cursor: 'pointer',
                transform: hoveredSocial === 'Copy email' ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: 'center',
                transition: 'transform 140ms ease, color 140ms ease'
              }}
            >
              {copied ? 'Copied email' : 'Copy email'}
            </button>
          </nav>
          <ul
            style={{
              margin: '1rem auto 0',
              paddingLeft: '1.35rem',
              display: 'grid',
              gap: '0.55rem',
              color: 'rgba(226,232,240,0.9)',
              fontSize: 'clamp(0.95rem, 1.3vw, 1.2rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.4,
              position: 'relative',
              zIndex: 25,
              listStyleType: 'disc',
              maxWidth: '34rem',
              textAlign: 'left'
            }}
          >
            {achievements.map((item) => (
              <li key={item} style={{ color: 'rgba(226,232,240,0.9)' }}>
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section
          style={{
            position: 'relative',
            zIndex: 60,
            padding: '2rem 2rem 4rem',
            maxWidth: '72rem',
            margin: '0 auto'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}
          >
            <h2
              style={{
                margin: 0,
                color: '#f8fafc',
                fontSize: 'clamp(1.25rem, 2vw, 1.6rem)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              Blog posts
            </h2>
            <a
              href={SUBSTACK_BASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'rgba(191,219,254,0.95)',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.9rem'
              }}
            >
              View all on Substack
            </a>
          </div>

          {isLoadingBlog && (
            <p style={{ color: 'rgba(226,232,240,0.75)', margin: 0 }}>Loading latest posts...</p>
          )}

          {!isLoadingBlog && blogError && (
            <p style={{ color: 'rgba(251,191,36,0.92)', margin: 0 }}>
              {blogError} You can still read everything on{' '}
              <a
                href={SUBSTACK_BASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#f8fafc', textDecoration: 'underline' }}
              >
                Substack
              </a>
              .
            </p>
          )}

          {!isLoadingBlog && !blogError && blogPosts.length === 0 && (
            <p style={{ color: 'rgba(226,232,240,0.75)', margin: 0 }}>
              No posts found yet. Check back soon on{' '}
              <a
                href={SUBSTACK_BASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#f8fafc', textDecoration: 'underline' }}
              >
                Substack
              </a>
              .
            </p>
          )}

          {!isLoadingBlog && !blogError && blogPosts.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem'
              }}
            >
              {blogPosts.slice(0, 6).map((post) => (
                <a
                  key={post.id}
                  href={post.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: 'none',
                    background: 'rgba(2,6,23,0.72)',
                    border: '1px solid rgba(148,163,184,0.18)',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    transition: 'transform 180ms ease, border-color 180ms ease',
                    display: 'block'
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      background: '#0b1223',
                      overflow: 'hidden'
                    }}
                  >
                    {post.image ? (
                      <img
                        src={post.image}
                        alt=""
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background:
                            'linear-gradient(135deg, rgba(37,99,235,0.55), rgba(30,41,59,0.55))'
                        }}
                      />
                    )}
                  </div>
                  <div style={{ padding: '1rem 1rem 1.1rem' }}>
                    <h3
                      style={{
                        margin: 0,
                        color: '#f8fafc',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        lineHeight: 1.35
                      }}
                    >
                      {post.title}
                    </h3>
                    {/* Intentionally title-only cards (no preview text or date). */}
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}

export default Home
