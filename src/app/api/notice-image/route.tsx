import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Fetch Inter from Google Fonts CSS API — gets the correct current file URL
async function loadInterFont(weight: number): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Vercel Edge)' } }
  ).then(r => r.text())

  // Extract woff2 URL from the CSS
  const match = css.match(/src: url\(([^)]+)\) format\('woff2'\)/)
  if (!match) throw new Error(`Inter ${weight} font URL not found`)

  return fetch(match[1]).then(r => r.arrayBuffer())
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') ?? 'Notice'
  const body  = searchParams.get('body')  ?? ''

  const maxChars = 300
  const displayBody = body.length > maxChars ? body.slice(0, maxChars).trimEnd() + '…' : body

  // Load Inter 400 (regular), 700 (bold), 800 (extra-bold)
  const [inter400, inter700, inter800] = await Promise.all([
    loadInterFont(400),
    loadInterFont(700),
    loadInterFont(800),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#f8fafc',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Navy header */}
        <div style={{ background: '#1B3A6B', padding: '26px 36px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#ffffff' }}>Get</span>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#C9931A' }}>Suitel</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
            Property Notice
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '26px 36px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Title */}
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 12, lineHeight: 1.3 }}>
            {title}
          </div>
          {/* Divider */}
          <div style={{ width: 40, height: 3, background: '#1B3A6B', borderRadius: 2, marginBottom: 16, display: 'flex' }} />
          {/* Body — bold 700 for strong readability */}
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
            {displayBody}
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', padding: '13px 36px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>
            GetSuitel · Smart Real Estate Management · getsuitel.com
          </span>
        </div>
      </div>
    ),
    {
      width: 640,
      height: 420,
      fonts: [
        { name: 'Inter', data: inter400, weight: 400, style: 'normal' },
        { name: 'Inter', data: inter700, weight: 700, style: 'normal' },
        { name: 'Inter', data: inter800, weight: 800, style: 'normal' },
      ],
    }
  )
}
