import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { generateTailoredResume } from '@/lib/ai'
import type { Profile } from '@/types/resume'

const PROFILE_PATH = path.join(process.cwd(), 'personaldata', 'profile.json')

export async function POST(request: Request) {
  try {
    const { jobDescription, jobTitle } = await request.json()

    if (!jobDescription) {
      return NextResponse.json({ error: 'jobDescription required' }, { status: 400 })
    }

    const profileData = await fs.readFile(PROFILE_PATH, 'utf-8')
    const profile: Profile = JSON.parse(profileData)

    const result = await generateTailoredResume(profile, jobDescription, jobTitle || 'the role')

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 })
  }
}
