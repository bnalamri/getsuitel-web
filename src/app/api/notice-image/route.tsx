import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') ?? 'Notice'
  const body  = searchParams.get('body')  ?? ''

  // Truncate body for the card — very long notices won't fit neatly
  const maxChars = 320
  const displayBody = body.length > maxChars ? body.slice(0, maxChars).trimEnd() + '…' : body

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#f8fafc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Navy header */}
        <div
          style={{
            background: '#1B3A6B',
            padding: '28px 36px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#ffffff' }}>Get</span>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#C9931A' }}>Suitel</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
            Property Notice
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '28px 36px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: 16,
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 15,
              color: '#334155',
              lineHeight: 1.75,
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
            padding: '14px 36px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            GetSuitel · Smart Real Estate Management · getsuitel.com
          </span>
        </div>
      </div>
    ),
    {
      width: 640,
      height: 420,
    }
  )
}
