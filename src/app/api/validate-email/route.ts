import { NextResponse } from 'next/server'
import dns from 'dns/promises'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const domain = (email as string).split('@')[1]
    if (!domain) return NextResponse.json({ valid: false })
    const records = await dns.resolveMx(domain)
    return NextResponse.json({ valid: records.length > 0 })
  } catch {
    // DNS lookup failed = domain doesn't exist or has no mail servers
    return NextResponse.json({ valid: false })
  }
}
