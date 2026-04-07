import { NextResponse } from 'next/server'
import { scrapeJobUrl } from '@/lib/scraper'

export async function POST(request: Request) {
  const { url } = await request.json()

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  const result = await scrapeJobUrl(url)
  return NextResponse.json(result)
}
