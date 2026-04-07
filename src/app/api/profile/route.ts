import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const PROFILE_PATH = path.join(process.cwd(), 'personaldata', 'profile.json')

export async function GET() {
  try {
    const data = await fs.readFile(PROFILE_PATH, 'utf-8')
    return NextResponse.json(JSON.parse(data))
  } catch {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await fs.writeFile(PROFILE_PATH, JSON.stringify(body, null, 2))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
