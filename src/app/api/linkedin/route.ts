import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { Profile } from '@/types/resume'

async function scrapeLinkedIn(url: string): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    })

    // LinkedIn redirects unauthenticated users to login
    if (response.url.includes('/login') || response.url.includes('/authwall')) {
      return { success: false, error: 'blocked' }
    }

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Check if we landed on a login/authwall page
    if ($('title').text().toLowerCase().includes('log in') || html.includes('authwall')) {
      return { success: false, error: 'blocked' }
    }

    $('script, style, nav, header, footer, aside, .nav, .footer').remove()

    const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000)

    if (text.length < 200) {
      return { success: false, error: 'blocked' }
    }

    return { success: true, text }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'fetch failed' }
  }
}

async function parseProfileWithAI(text: string): Promise<Profile> {
  const prompt = `Extract structured resume/profile data from the following LinkedIn profile text.

## LinkedIn Profile Text
${text}

## Instructions
- Extract all available information: name, email, phone, location, linkedin URL, website, summary/about, work experience, education, skills, projects
- For experience bullets, extract key responsibilities and achievements as bullet points
- For dates, use format "Mon YYYY" (e.g. "Jan 2020") or leave empty if not found
- If a field is not found, use empty string or empty array
- Do not invent or guess information not present in the text

Respond with ONLY valid JSON matching this exact structure:
{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "website": "",
  "summary": "",
  "experience": [{ "company": "", "title": "", "location": "", "dates": "", "bullets": [] }],
  "education": [{ "school": "", "degree": "", "field": "", "dates": "" }],
  "skills": [],
  "projects": [{ "name": "", "description": "", "technologies": [], "url": "" }]
}`

  const provider = process.env.AI_PROVIDER || 'claude'

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    })
    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Empty response')
    return JSON.parse(content) as Profile
  } else {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })
    const block = message.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type')
    const json = block.text.replace(/```json\s*/g, '').replace(/```/g, '').trim()
    return JSON.parse(json) as Profile
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL required' }, { status: 400 })
    }

    const scraped = await scrapeLinkedIn(url)

    if (!scraped.success || !scraped.text) {
      return NextResponse.json({ success: false, blocked: scraped.error === 'blocked', error: scraped.error })
    }

    const profile = await parseProfileWithAI(scraped.text)
    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('LinkedIn import error:', error)
    return NextResponse.json({ success: false, error: 'Failed to parse profile' }, { status: 500 })
  }
}
