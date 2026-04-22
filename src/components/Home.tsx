import { useEffect, useMemo, useState } from 'react'

type BlogPost = {
  id: string
  title: string
  href: string
  image?: string
}

const SUBSTACK_BASE_URL = 'https://dariansdrafts.substack.com'
const SUBSTACK_API_URL = '/api/substack-posts'
const BLOG_CACHE_KEY = 'substack_posts_cache_v4'
const BLOG_FETCH_TIMEOUT_MS = 2500

const Home = () => {
  const [copied, setCopied] = useState(false)
  const [hoveredSocial, setHoveredSocial] = useState<string | null>(null)
  const [hoveredAchievement, setHoveredAchievement] = useState<string | null>(null)
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
    type CachedBlogPayload = {
      fetchedAt: number
      posts: BlogPost[]
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

    const loadFromApi = async () => {
      const response = await fetchWithTimeout(SUBSTACK_API_URL)
      if (!response.ok) throw new Error('Substack API request failed.')

      const payload = (await response.json()) as {
        posts?: BlogPost[]
      }

      if (!payload.posts || !Array.isArray(payload.posts) || payload.posts.length === 0) {
        throw new Error('No posts found from Substack API.')
      }

      return payload.posts.slice(0, 6)
    }

    const loadPosts = async () => {
      const cached = readCachedPosts()
      if (cached?.posts?.length) {
        setBlogPosts(cached.posts)
        setIsLoadingBlog(false)
      } else {
        setIsLoadingBlog(true)
      }

      setBlogError(null)

      // Always revalidate in the background so live updates appear quickly.
      // Cache is still used for instant paint before the network request resolves.

      try {
        const freshPosts = await loadFromApi()
        setBlogPosts(freshPosts)
        writeCachedPosts(freshPosts)
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
            padding: '3.25rem 2.4rem 0',
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
              margin: '1.25rem 0 0',
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
              gap: '1.15rem',
              marginTop: '2.2rem',
              marginBottom: 0
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
              margin: '3.6rem auto 4rem',
              paddingLeft: '1.35rem',
              display: 'grid',
              gap: '1rem',
              color: 'rgba(226,232,240,0.9)',
              fontSize: 'clamp(0.95rem, 1.3vw, 1.2rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.55,
              position: 'relative',
              zIndex: 25,
              listStyleType: 'disc',
              maxWidth: '34rem',
              textAlign: 'left'
            }}
          >
            <li
              onMouseEnter={() => setHoveredAchievement('first invention')}
              onMouseLeave={() => setHoveredAchievement(null)}
              style={{
                color:
                  hoveredAchievement === 'first invention'
                    ? 'rgba(248,250,252,1)'
                    : 'rgba(226,232,240,0.9)',
                transform: hoveredAchievement === 'first invention' ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'transform 140ms ease, color 140ms ease'
              }}
            >
              Built my <strong>first invention</strong> at 8
            </li>
            <li
              onMouseEnter={() => setHoveredAchievement('3x martial arts')}
              onMouseLeave={() => setHoveredAchievement(null)}
              style={{
                color:
                  hoveredAchievement === '3x martial arts'
                    ? 'rgba(248,250,252,1)'
                    : 'rgba(226,232,240,0.9)',
                transform: hoveredAchievement === '3x martial arts' ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'transform 140ms ease, color 140ms ease'
              }}
            >
              Won <strong>3x world martial arts gold</strong> by 16
            </li>
            <li
              onMouseEnter={() => setHoveredAchievement('five figures')}
              onMouseLeave={() => setHoveredAchievement(null)}
              style={{
                color:
                  hoveredAchievement === 'five figures'
                    ? 'rgba(248,250,252,1)'
                    : 'rgba(226,232,240,0.9)',
                transform: hoveredAchievement === 'five figures' ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'transform 140ms ease, color 140ms ease'
              }}
            >
              Scaled a dropshipping store to <strong>five figures</strong> at 14
            </li>
            <li
              onMouseEnter={() => setHoveredAchievement('28 countries')}
              onMouseLeave={() => setHoveredAchievement(null)}
              style={{
                color:
                  hoveredAchievement === '28 countries'
                    ? 'rgba(248,250,252,1)'
                    : 'rgba(226,232,240,0.9)',
                transform: hoveredAchievement === '28 countries' ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'transform 140ms ease, color 140ms ease'
              }}
            >
              Built a global nonprofit serving <strong>28 countries</strong> at 15
            </li>
            <li
              onMouseEnter={() => setHoveredAchievement('book and paper')}
              onMouseLeave={() => setHoveredAchievement(null)}
              style={{
                color:
                  hoveredAchievement === 'book and paper'
                    ? 'rgba(248,250,252,1)'
                    : 'rgba(226,232,240,0.9)',
                transform: hoveredAchievement === 'book and paper' ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'transform 140ms ease, color 140ms ease'
              }}
            >
              Published a <strong>book</strong> and a <strong>research paper</strong> at 16
            </li>
            <li
              onMouseEnter={() => setHoveredAchievement('38 retention')}
              onMouseLeave={() => setHoveredAchievement(null)}
              style={{
                color:
                  hoveredAchievement === '38 retention'
                    ? 'rgba(248,250,252,1)'
                    : 'rgba(226,232,240,0.9)',
                transform: hoveredAchievement === '38 retention' ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'transform 140ms ease, color 140ms ease'
              }}
            >
              Shipped 8 AI features at a Series A startup, drove <strong>38% retention lift</strong>
            </li>
            <li
              onMouseEnter={() => setHoveredAchievement('tripled activation')}
              onMouseLeave={() => setHoveredAchievement(null)}
              style={{
                color:
                  hoveredAchievement === 'tripled activation'
                    ? 'rgba(248,250,252,1)'
                    : 'rgba(226,232,240,0.9)',
                transform:
                  hoveredAchievement === 'tripled activation' ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'transform 140ms ease, color 140ms ease'
              }}
            >
              <strong>Tripled activation rate</strong> at an Antler-backed startup
            </li>
            <li
              onMouseEnter={() => setHoveredAchievement('41 conversion')}
              onMouseLeave={() => setHoveredAchievement(null)}
              style={{
                color:
                  hoveredAchievement === '41 conversion'
                    ? 'rgba(248,250,252,1)'
                    : 'rgba(226,232,240,0.9)',
                transform: hoveredAchievement === '41 conversion' ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'transform 140ms ease, color 140ms ease'
              }}
            >
              Drove <strong>41% conversion lift</strong> at a VC-backed AI platform
            </li>
            <li
              onMouseEnter={() => setHoveredAchievement('12k community')}
              onMouseLeave={() => setHoveredAchievement(null)}
              style={{
                color:
                  hoveredAchievement === '12k community'
                    ? 'rgba(248,250,252,1)'
                    : 'rgba(226,232,240,0.9)',
                transform: hoveredAchievement === '12k community' ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'transform 140ms ease, color 140ms ease'
              }}
            >
              Host weekly founder events, <strong>grew community to 12k+</strong>
            </li>
            <li
              onMouseEnter={() => setHoveredAchievement('350k listens')}
              onMouseLeave={() => setHoveredAchievement(null)}
              style={{
                color:
                  hoveredAchievement === '350k listens'
                    ? 'rgba(248,250,252,1)'
                    : 'rgba(226,232,240,0.9)',
                transform: hoveredAchievement === '350k listens' ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'transform 140ms ease, color 140ms ease'
              }}
            >
              Co-host of a podcast with <strong>350k listens</strong>
            </li>
            <li
              onMouseEnter={() => setHoveredAchievement('acting debut')}
              onMouseLeave={() => setHoveredAchievement(null)}
              style={{
                color:
                  hoveredAchievement === 'acting debut'
                    ? 'rgba(248,250,252,1)'
                    : 'rgba(226,232,240,0.9)',
                transform: hoveredAchievement === 'acting debut' ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'transform 140ms ease, color 140ms ease'
              }}
            >
              Made my <strong>acting debut</strong> at 19
            </li>
          </ul>
        </section>
        <section
          style={{
            position: 'relative',
            zIndex: 60,
            padding: '0.6rem 2.4rem 4.8rem',
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
              marginBottom: '1.3rem'
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
                gap: '1.85rem'
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
                  <div style={{ padding: '1.15rem 1.15rem 1.25rem' }}>
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
