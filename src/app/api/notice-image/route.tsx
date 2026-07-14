import { ImageResponse } from 'next/og'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') ?? 'Notice'
  const body  = searchParams.get('body')  ?? ''

  const maxChars = 300
  const displayBody = body.length > maxChars ? body.slice(0, maxChars).trimEnd() + '…' : body

  // next/og bundles Noto Sans by default — no external fetch needed.
  // Use fontWeight 800 for both title and body (same typeface, smaller size for body)
  // so they share the same strong visual character the user likes.
  const image = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#f8fafc',
        }}
      >
        {/* Navy header */}
        <div
          style={{
            background: '#1B3A6B',
            padding: '26px 36px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#ffffff' }}>Get</span>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#C9931A' }}>Suitel</span>
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.65)',
              marginTop: 4,
            }}
          >
            Property Notice
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '28px 36px 20px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          {/* Title — large & extra-bold */}
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: 14,
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>

          {/* Divider */}
          <div
            style={{
              width: 40,
              height: 3,
              background: '#1B3A6B',
              borderRadius: 2,
              marginBottom: 18,
              display: 'flex',
            }}
          />

          {/* Body — same bold weight as title, smaller size */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: '#1e293b',
              lineHeight: 1.9,
              whiteSpace: 'pre-wrap',
            }}
          >
            {displayBody}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#f1f5f9',
            borderTop: '1px solid #e2e8f0',
            padding: '13px 36px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>
            GetSuitel · Smart Real Estate Management · getsuitel.com
          </span>
        </div>
      </div>
    ),
    { width: 640, height: 420 }
  )

  // Prevent CDN / browser from caching the old image
  const response = new Response(image.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
  return response
}
