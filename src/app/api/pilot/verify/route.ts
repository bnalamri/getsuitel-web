import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { code } = await req.json()
  const pilotCode = process.env.PILOT_ACCESS_CODE
  if (!pilotCode) return NextResponse.json({ valid: true }) // no gate set — open access
  const valid = code?.trim().toUpperCase() === pilotCode.trim().toUpperCase()
  return NextResponse.json({ valid })
}
