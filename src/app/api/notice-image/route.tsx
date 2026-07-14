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

  // Load Inter from Google Fonts (Regular 400 + SemiBold 600 + Bold 700 + ExtraBold 800)
  const [interRegular, interSemiBold, interBold, interExtraBold] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyYAZ9hiJ-Ek-_EeA.woff').then(r => r.arrayBuffer()),
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
        <div
          style={{
            background: '#1B3A6B',
            padding: '26px 36px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#ffffff' }}>Get</span>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#C9931A' }}>Suitel</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
            Property Notice
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '26px 36px 20px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 23,
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 14,
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>

          {/* Divider */}
          <div style={{ width: 40, height: 3, background: '#1B3A6B', borderRadius: 2, marginBottom: 16, display: 'flex' }} />

          {/* Message body — semi-bold for clarity */}
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#1e293b',
              lineHeight: 1.8,
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
    {
      width: 640,
      height: 420,
      fonts: [
        { name: 'Inter', data: interRegular,   weight: 400, style: 'normal' },
        { name: 'Inter', data: interSemiBold,  weight: 600, style: 'normal' },
        { name: 'Inter', data: interBold,      weight: 700, style: 'normal' },
        { name: 'Inter', data: interExtraBold, weight: 800, style: 'normal' },
      ],
    }
  )
}
