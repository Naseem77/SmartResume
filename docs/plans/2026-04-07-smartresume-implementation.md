# SmartResume Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js web app that takes a user's base resume profile and a job URL, uses Claude AI to generate a tailored ATS-optimized resume, shows an ATS score, and lets the user download a clean PDF.

**Architecture:** Next.js 14 App Router with TypeScript and Tailwind CSS for the UI. API routes handle scraping (Cheerio), AI generation (Claude API), and PDF rendering (Puppeteer). User profile data is persisted locally in `personaldata/profile.json`.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Claude API (`@anthropic-ai/sdk`), Cheerio, Puppeteer, shadcn/ui components.

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `.env.local.example`

**Step 1: Initialize Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --yes
```

**Step 2: Install dependencies**

```bash
npm install @anthropic-ai/sdk cheerio puppeteer
npm install -D @types/node
```

**Step 3: Create `.env.local.example`**

```
ANTHROPIC_API_KEY=your_api_key_here
```

Copy to `.env.local` and add your actual key.

**Step 4: Create `personaldata/` directory with empty profile**

```bash
mkdir -p personaldata
```

Create `personaldata/profile.json`:
```json
{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "website": "",
  "summary": "",
  "experience": [],
  "education": [],
  "skills": [],
  "projects": []
}
```

**Step 5: Verify dev server starts**

```bash
npm run dev
```
Expected: Server running at http://localhost:3000

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Profile API Route

**Files:**
- Create: `app/api/profile/route.ts`

**Step 1: Write the test (manual curl test)**

After implementing, test with:
```bash
curl http://localhost:3000/api/profile
# Expected: { "name": "", "email": "", ... }

curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","phone":"","location":"","linkedin":"","website":"","summary":"","experience":[],"education":[],"skills":[],"projects":[]}'
# Expected: { "success": true }
```

**Step 2: Implement `app/api/profile/route.ts`**

```typescript
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
```

**Step 3: Run manual tests**

Start dev server and run the curl commands from Step 1. Verify both responses.

**Step 4: Commit**

```bash
git add app/api/profile/route.ts
git commit -m "feat: add profile GET/POST API route"
```

---

## Task 3: Scrape API Route

**Files:**
- Create: `lib/scraper.ts`
- Create: `app/api/scrape/route.ts`

**Step 1: Implement `lib/scraper.ts`**

```typescript
import * as cheerio from 'cheerio'

export interface ScrapeResult {
  success: boolean
  jobTitle?: string
  company?: string
  description?: string
  error?: string
}

export async function scrapeJobUrl(url: string): Promise<ScrapeResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove noise
    $('script, style, nav, header, footer, aside').remove()

    const jobTitle =
      $('h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim()

    // Try common job board selectors
    const descriptionSelectors = [
      '[class*="job-description"]',
      '[class*="jobDescription"]',
      '[class*="description"]',
      '[id*="job-description"]',
      '[id*="jobDescription"]',
      'article',
      'main',
    ]

    let description = ''
    for (const selector of descriptionSelectors) {
      const text = $(selector).first().text().trim()
      if (text.length > 200) {
        description = text
        break
      }
    }

    if (!description) {
      description = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000)
    }

    if (!description || description.length < 100) {
      return { success: false, error: 'Could not extract job description' }
    }

    return { success: true, jobTitle, description }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Scrape failed' }
  }
}
```

**Step 2: Implement `app/api/scrape/route.ts`**

```typescript
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
```

**Step 3: Manual test**

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://jobs.lever.co/anthropic"}'
# Expected: { "success": true/false, "jobTitle": "...", "description": "..." }
```

**Step 4: Commit**

```bash
git add lib/scraper.ts app/api/scrape/route.ts
git commit -m "feat: add job URL scraper with Cheerio"
```

---

## Task 4: Claude Resume Generation API Route

**Files:**
- Create: `lib/claude.ts`
- Create: `app/api/generate/route.ts`
- Create: `types/resume.ts`

**Step 1: Create `types/resume.ts`**

```typescript
export interface Experience {
  company: string
  title: string
  location: string
  dates: string
  bullets: string[]
}

export interface Education {
  school: string
  degree: string
  field: string
  dates: string
}

export interface Project {
  name: string
  description: string
  technologies: string[]
  url?: string
}

export interface Profile {
  name: string
  email: string
  phone: string
  location: string
  linkedin: string
  website: string
  summary: string
  experience: Experience[]
  education: Education[]
  skills: string[]
  projects: Project[]
}

export interface TailoredResume {
  name: string
  email: string
  phone: string
  location: string
  linkedin: string
  website: string
  summary: string
  experience: Experience[]
  education: Education[]
  skills: string[]
  projects: Project[]
}

export interface AtsScore {
  score: number
  breakdown: {
    keywordMatch: number
    sectionCompleteness: number
    formattingCompliance: number
    relevance: number
  }
  suggestions: string[]
}

export interface GenerateResult {
  resume: TailoredResume
  atsScore: AtsScore
  jobTitle: string
}
```

**Step 2: Implement `lib/claude.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { Profile, GenerateResult } from '@/types/resume'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateTailoredResume(
  profile: Profile,
  jobDescription: string,
  jobTitle: string
): Promise<GenerateResult> {
  const prompt = `You are an expert resume writer and ATS optimization specialist.

Given the candidate's base profile and a job description, create a tailored resume optimized for ATS (Applicant Tracking Systems) and the specific role.

## Candidate Profile
${JSON.stringify(profile, null, 2)}

## Job Title
${jobTitle}

## Job Description
${jobDescription}

## Instructions
1. Rewrite the summary to directly address this specific role
2. Reorder and rewrite experience bullets to highlight relevant achievements and incorporate job keywords naturally
3. Select and reorder skills to prioritize those mentioned in the job description
4. Include only the most relevant projects
5. Keep all factual information accurate — do not invent experience
6. Use standard ATS-safe section headings: Summary, Experience, Education, Skills, Projects
7. Use action verbs and quantify achievements where the original data supports it

Also provide an ATS score (0-100) with breakdown across:
- keywordMatch: how well resume keywords match job description (0-100)
- sectionCompleteness: presence of all key sections (0-100)
- formattingCompliance: ATS formatting best practices (0-100)
- relevance: overall relevance of experience to this role (0-100)

And 2-3 brief suggestions for improvement.

Respond with ONLY valid JSON in this exact structure:
{
  "resume": {
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
  },
  "atsScore": {
    "score": 0,
    "breakdown": {
      "keywordMatch": 0,
      "sectionCompleteness": 0,
      "formattingCompliance": 0,
      "relevance": 0
    },
    "suggestions": []
  },
  "jobTitle": ""
}`

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  // Strip any markdown code fences if present
  const json = content.text.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```$/m, '').trim()
  return JSON.parse(json) as GenerateResult
}
```

**Step 3: Implement `app/api/generate/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { generateTailoredResume } from '@/lib/claude'
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
```

**Step 4: Verify ANTHROPIC_API_KEY is in `.env.local`, then test**

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"jobTitle":"Software Engineer","jobDescription":"We are looking for a software engineer with experience in React, Node.js, and TypeScript..."}'
# Expected: JSON with resume and atsScore objects
```

**Step 5: Commit**

```bash
git add types/resume.ts lib/claude.ts app/api/generate/route.ts
git commit -m "feat: add Claude resume generation and ATS scoring API"
```

---

## Task 5: PDF Generation API Route

**Files:**
- Create: `lib/resumeTemplate.ts`
- Create: `app/api/pdf/route.ts`

**Step 1: Implement `lib/resumeTemplate.ts`**

```typescript
import type { TailoredResume } from '@/types/resume'

export function buildResumeHtml(resume: TailoredResume, jobTitle: string): string {
  const experiences = resume.experience.map(exp => `
    <div class="section-item">
      <div class="item-header">
        <div>
          <span class="item-title">${exp.title}</span>
          <span class="item-subtitle"> — ${exp.company}${exp.location ? `, ${exp.location}` : ''}</span>
        </div>
        <span class="item-date">${exp.dates}</span>
      </div>
      <ul>
        ${exp.bullets.map(b => `<li>${b}</li>`).join('')}
      </ul>
    </div>
  `).join('')

  const education = resume.education.map(edu => `
    <div class="section-item">
      <div class="item-header">
        <div>
          <span class="item-title">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</span>
          <span class="item-subtitle"> — ${edu.school}</span>
        </div>
        <span class="item-date">${edu.dates}</span>
      </div>
    </div>
  `).join('')

  const projects = resume.projects.length > 0 ? `
    <div class="section">
      <h2>Projects</h2>
      ${resume.projects.map(p => `
        <div class="section-item">
          <div class="item-header">
            <span class="item-title">${p.name}${p.url ? ` <span class="item-subtitle">— ${p.url}</span>` : ''}</span>
          </div>
          <p>${p.description}</p>
          ${p.technologies.length > 0 ? `<p><em>Technologies: ${p.technologies.join(', ')}</em></p>` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''

  const contactParts = [resume.email, resume.phone, resume.location, resume.linkedin, resume.website].filter(Boolean)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    padding: 0.75in 1in;
  }
  h1 { font-size: 18pt; margin-bottom: 4px; }
  .contact { font-size: 10pt; color: #333; margin-bottom: 16px; }
  h2 {
    font-size: 12pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #000;
    padding-bottom: 2px;
    margin: 14px 0 8px;
  }
  .section-item { margin-bottom: 10px; }
  .item-header { display: flex; justify-content: space-between; margin-bottom: 3px; }
  .item-title { font-weight: bold; }
  .item-subtitle { font-weight: normal; }
  .item-date { font-size: 10pt; white-space: nowrap; margin-left: 8px; }
  ul { padding-left: 18px; margin-top: 3px; }
  li { margin-bottom: 2px; }
  .skills-list { line-height: 1.6; }
  p { margin-top: 3px; }
</style>
</head>
<body>
  <h1>${resume.name}</h1>
  <div class="contact">${contactParts.join(' | ')}</div>

  ${resume.summary ? `
  <div class="section">
    <h2>Summary</h2>
    <p>${resume.summary}</p>
  </div>` : ''}

  <div class="section">
    <h2>Experience</h2>
    ${experiences}
  </div>

  <div class="section">
    <h2>Education</h2>
    ${education}
  </div>

  ${resume.skills.length > 0 ? `
  <div class="section">
    <h2>Skills</h2>
    <div class="skills-list">${resume.skills.join(' • ')}</div>
  </div>` : ''}

  ${projects}
</body>
</html>`
}
```

**Step 2: Implement `app/api/pdf/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { buildResumeHtml } from '@/lib/resumeTemplate'
import type { TailoredResume } from '@/types/resume'

export async function POST(request: Request) {
  let browser
  try {
    const { resume, jobTitle }: { resume: TailoredResume; jobTitle: string } = await request.json()

    const html = buildResumeHtml(resume, jobTitle)

    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    await browser.close()

    const filename = `resume-${jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    if (browser) await browser.close()
    console.error('PDF error:', error)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
```

**Step 3: Commit**

```bash
git add lib/resumeTemplate.ts app/api/pdf/route.ts
git commit -m "feat: add Puppeteer PDF generation with ATS-safe template"
```

---

## Task 6: Profile Page UI

**Files:**
- Create: `app/profile/page.tsx`
- Create: `components/ProfileForm.tsx`

**Step 1: Implement `components/ProfileForm.tsx`**

This form covers all sections of the profile: personal info, experience (dynamic), education (dynamic), skills (tag-style), and projects (dynamic). It loads from `/api/profile` on mount and saves to `/api/profile` on submit.

```typescript
'use client'

import { useState, useEffect } from 'react'
import type { Profile, Experience, Education, Project } from '@/types/resume'

const emptyProfile: Profile = {
  name: '', email: '', phone: '', location: '', linkedin: '', website: '',
  summary: '', experience: [], education: [], skills: [], projects: [],
}

const emptyExp: Experience = { company: '', title: '', location: '', dates: '', bullets: [] }
const emptyEdu: Education = { school: '', degree: '', field: '', dates: '' }
const emptyProject: Project = { name: '', description: '', technologies: [], url: '' }

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [skillInput, setSkillInput] = useState('')

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(data => {
      if (!data.error) setProfile(data)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const updateField = (field: keyof Profile, value: unknown) =>
    setProfile(p => ({ ...p, [field]: value }))

  const updateExp = (i: number, field: keyof Experience, value: unknown) =>
    setProfile(p => ({ ...p, experience: p.experience.map((e, idx) => idx === i ? { ...e, [field]: value } : e) }))

  const updateEdu = (i: number, field: keyof Education, value: string) =>
    setProfile(p => ({ ...p, education: p.education.map((e, idx) => idx === i ? { ...e, [field]: value } : e) }))

  const updateProject = (i: number, field: keyof Project, value: unknown) =>
    setProfile(p => ({ ...p, projects: p.projects.map((proj, idx) => idx === i ? { ...proj, [field]: value } : proj) }))

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !profile.skills.includes(s)) {
      updateField('skills', [...profile.skills, s])
    }
    setSkillInput('')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Personal Info */}
      <section>
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">Personal Info</h2>
        <div className="grid grid-cols-2 gap-4">
          {(['name','email','phone','location','linkedin','website'] as const).map(f => (
            <div key={f}>
              <label className="block text-sm font-medium capitalize mb-1">{f}</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile[f]} onChange={e => updateField(f, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Summary</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3} value={profile.summary} onChange={e => updateField('summary', e.target.value)} />
        </div>
      </section>

      {/* Experience */}
      <section>
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h2 className="text-xl font-semibold">Experience</h2>
          <button onClick={() => updateField('experience', [...profile.experience, { ...emptyExp }])}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add</button>
        </div>
        {profile.experience.map((exp, i) => (
          <div key={i} className="border rounded-lg p-4 mb-4 space-y-3 bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              {(['title','company','location','dates'] as const).map(f => (
                <div key={f}>
                  <label className="block text-xs font-medium capitalize mb-1">{f}</label>
                  <input className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={exp[f]} onChange={e => updateExp(i, f, e.target.value)} />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Bullets (one per line)</label>
              <textarea className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={exp.bullets.join('\n')}
                onChange={e => updateExp(i, 'bullets', e.target.value.split('\n'))} />
            </div>
            <button onClick={() => updateField('experience', profile.experience.filter((_, idx) => idx !== i))}
              className="text-xs text-red-500 hover:text-red-700">Remove</button>
          </div>
        ))}
      </section>

      {/* Education */}
      <section>
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h2 className="text-xl font-semibold">Education</h2>
          <button onClick={() => updateField('education', [...profile.education, { ...emptyEdu }])}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add</button>
        </div>
        {profile.education.map((edu, i) => (
          <div key={i} className="border rounded-lg p-4 mb-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              {(['school','degree','field','dates'] as const).map(f => (
                <div key={f}>
                  <label className="block text-xs font-medium capitalize mb-1">{f}</label>
                  <input className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={edu[f]} onChange={e => updateEdu(i, f, e.target.value)} />
                </div>
              ))}
            </div>
            <button onClick={() => updateField('education', profile.education.filter((_, idx) => idx !== i))}
              className="text-xs text-red-500 hover:text-red-700 mt-2">Remove</button>
          </div>
        ))}
      </section>

      {/* Skills */}
      <section>
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">Skills</h2>
        <div className="flex gap-2 mb-3">
          <input className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add a skill..." value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
          <button onClick={addSkill} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map(skill => (
            <span key={skill} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              {skill}
              <button onClick={() => updateField('skills', profile.skills.filter(s => s !== skill))}
                className="text-blue-600 hover:text-blue-900 font-bold ml-1">×</button>
            </span>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section>
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h2 className="text-xl font-semibold">Projects</h2>
          <button onClick={() => updateField('projects', [...profile.projects, { ...emptyProject }])}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add</button>
        </div>
        {profile.projects.map((proj, i) => (
          <div key={i} className="border rounded-lg p-4 mb-4 bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Name</label>
                <input className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={proj.name} onChange={e => updateProject(i, 'name', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">URL</label>
                <input className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={proj.url || ''} onChange={e => updateProject(i, 'url', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Description</label>
              <textarea className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2} value={proj.description} onChange={e => updateProject(i, 'description', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Technologies (comma-separated)</label>
              <input className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={proj.technologies.join(', ')}
                onChange={e => updateProject(i, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} />
            </div>
            <button onClick={() => updateField('projects', profile.projects.filter((_, idx) => idx !== i))}
              className="text-xs text-red-500 hover:text-red-700">Remove</button>
          </div>
        ))}
      </section>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <button onClick={save} disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Implement `app/profile/page.tsx`**

```typescript
import ProfileForm from '@/components/ProfileForm'

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">Your base resume information. This is used to generate tailored resumes.</p>
        </div>
        <ProfileForm />
      </div>
    </main>
  )
}
```

**Step 3: Visit http://localhost:3000/profile and verify the form renders and saves**

**Step 4: Commit**

```bash
git add app/profile/page.tsx components/ProfileForm.tsx
git commit -m "feat: add profile editor page with dynamic form sections"
```

---

## Task 7: Apply Page UI (Job Input + Generation + Results)

**Files:**
- Create: `app/apply/page.tsx`
- Create: `components/JobInput.tsx`
- Create: `components/ResumePreview.tsx`
- Create: `components/AtsScore.tsx`

**Step 1: Implement `components/JobInput.tsx`**

```typescript
'use client'

import { useState } from 'react'

interface Props {
  onJobReady: (jobDescription: string, jobTitle: string) => void
}

export default function JobInput({ onJobReady }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualText, setManualText] = useState('')
  const [manualTitle, setManualTitle] = useState('')
  const [scraped, setScraped] = useState<{ jobTitle?: string; description?: string } | null>(null)

  const handleScrape = async () => {
    setLoading(true)
    setShowManual(false)
    const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
    const data = await res.json()
    setLoading(false)
    if (data.success) {
      setScraped(data)
    } else {
      setShowManual(true)
    }
  }

  if (scraped) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 font-medium text-sm">Job description extracted successfully</p>
          <p className="text-green-900 font-semibold mt-1">{scraped.jobTitle}</p>
        </div>
        <div className="bg-gray-50 border rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap">
          {scraped.description}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setScraped(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Try different URL</button>
          <button onClick={() => onJobReady(scraped.description!, scraped.jobTitle || 'Role')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Generate Resume
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input className="flex-1 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste job URL (LinkedIn, Glassdoor, etc.)"
          value={url} onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleScrape()} />
        <button onClick={handleScrape} disabled={!url || loading}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Fetching...' : 'Fetch Job'}
        </button>
      </div>
      <button onClick={() => setShowManual(true)} className="text-sm text-blue-600 hover:underline">
        Or paste job description manually
      </button>
      {showManual && (
        <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
          <div>
            <label className="block text-sm font-medium mb-1">Job Title</label>
            <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Senior Software Engineer"
              value={manualTitle} onChange={e => setManualTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Job Description</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={8} placeholder="Paste the full job description here..."
              value={manualText} onChange={e => setManualText(e.target.value)} />
          </div>
          <button onClick={() => onJobReady(manualText, manualTitle || 'Role')}
            disabled={!manualText.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Generate Resume
          </button>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Implement `components/AtsScore.tsx`**

```typescript
import type { AtsScore as AtsScoreType } from '@/types/resume'

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function AtsScore({ atsScore }: { atsScore: AtsScoreType }) {
  const { score, breakdown, suggestions } = atsScore
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
  const ringColor = score >= 80 ? 'border-green-500' : score >= 60 ? 'border-yellow-500' : 'border-red-500'

  return (
    <div className="border rounded-xl p-6 bg-white shadow-sm space-y-5">
      <div className="flex items-center gap-6">
        <div className={`w-24 h-24 rounded-full border-8 ${ringColor} flex items-center justify-center flex-shrink-0`}>
          <span className={`text-3xl font-bold ${scoreColor}`}>{score}</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">ATS Score</h3>
          <p className="text-sm text-gray-500">
            {score >= 80 ? 'Great match! This resume should pass most ATS filters.' :
             score >= 60 ? 'Good match. A few improvements could help.' :
             'Needs improvement to pass ATS filters.'}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <ScoreBar label="Keyword Match" value={breakdown.keywordMatch} />
        <ScoreBar label="Section Completeness" value={breakdown.sectionCompleteness} />
        <ScoreBar label="Formatting Compliance" value={breakdown.formattingCompliance} />
        <ScoreBar label="Role Relevance" value={breakdown.relevance} />
      </div>
      {suggestions.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">Suggestions</p>
          <ul className="space-y-1">
            {suggestions.map((s, i) => (
              <li key={i} className="text-sm text-blue-700 flex gap-2">
                <span>•</span><span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Implement `components/ResumePreview.tsx`**

```typescript
import type { TailoredResume } from '@/types/resume'

export default function ResumePreview({ resume }: { resume: TailoredResume }) {
  const contact = [resume.email, resume.phone, resume.location, resume.linkedin, resume.website].filter(Boolean)

  return (
    <div className="bg-white border rounded-xl shadow-sm p-8 font-serif text-sm leading-relaxed text-gray-900 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{resume.name}</h1>
        <p className="text-gray-500 text-xs mt-1">{contact.join(' • ')}</p>
      </div>

      {resume.summary && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b pb-1 mb-2">Summary</h2>
          <p className="text-gray-700">{resume.summary}</p>
        </div>
      )}

      {resume.experience.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b pb-1 mb-3">Experience</h2>
          {resume.experience.map((exp, i) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between">
                <div>
                  <span className="font-semibold">{exp.title}</span>
                  <span className="text-gray-600"> — {exp.company}{exp.location ? `, ${exp.location}` : ''}</span>
                </div>
                <span className="text-gray-500 text-xs">{exp.dates}</span>
              </div>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-700">
                {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {resume.education.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b pb-1 mb-3">Education</h2>
          {resume.education.map((edu, i) => (
            <div key={i} className="flex justify-between">
              <span><span className="font-semibold">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</span> — {edu.school}</span>
              <span className="text-gray-500 text-xs">{edu.dates}</span>
            </div>
          ))}
        </div>
      )}

      {resume.skills.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b pb-1 mb-2">Skills</h2>
          <p className="text-gray-700">{resume.skills.join(' • ')}</p>
        </div>
      )}

      {resume.projects.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b pb-1 mb-3">Projects</h2>
          {resume.projects.map((proj, i) => (
            <div key={i} className="mb-3">
              <span className="font-semibold">{proj.name}</span>
              {proj.url && <span className="text-gray-500 text-xs ml-2">{proj.url}</span>}
              <p className="text-gray-700 mt-0.5">{proj.description}</p>
              {proj.technologies.length > 0 && <p className="text-gray-500 text-xs mt-0.5">{proj.technologies.join(', ')}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Implement `app/apply/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import JobInput from '@/components/JobInput'
import ResumePreview from '@/components/ResumePreview'
import AtsScore from '@/components/AtsScore'
import type { GenerateResult } from '@/types/resume'

type Step = 'input' | 'generating' | 'result'

export default function ApplyPage() {
  const [step, setStep] = useState<Step>('input')
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [downloading, setDownloading] = useState(false)

  const handleGenerate = async (jobDescription: string, jobTitle: string) => {
    setStep('generating')
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription, jobTitle }),
    })
    const data: GenerateResult = await res.json()
    setResult(data)
    setStep('result')
  }

  const handleDownload = async () => {
    if (!result) return
    setDownloading(true)
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume: result.resume, jobTitle: result.jobTitle }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume-${result.jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Generate Resume</h1>
          <p className="text-gray-500 mt-1">Paste a job URL and we'll tailor your resume to match.</p>
        </div>

        {step === 'input' && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Job Posting</h2>
            <JobInput onJobReady={handleGenerate} />
          </div>
        )}

        {step === 'generating' && (
          <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Generating your tailored resume...</p>
            <p className="text-gray-400 text-sm mt-1">This usually takes 10-20 seconds</p>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{result.jobTitle}</h2>
                <p className="text-gray-500 text-sm">Resume tailored for this role</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('input')} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                  New Resume
                </button>
                <button onClick={handleDownload} disabled={downloading}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {downloading ? 'Generating PDF...' : 'Download PDF'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <ResumePreview resume={result.resume} />
              </div>
              <div>
                <AtsScore atsScore={result.atsScore} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
```

**Step 5: Verify full flow at http://localhost:3000/apply**

- Paste a job URL or use manual paste
- Confirm generation works and results show
- Confirm PDF download triggers

**Step 6: Commit**

```bash
git add app/apply/page.tsx components/JobInput.tsx components/ResumePreview.tsx components/AtsScore.tsx
git commit -m "feat: add apply page with job input, resume preview, and ATS score"
```

---

## Task 8: Home Page

**Files:**
- Modify: `app/page.tsx`

**Step 1: Implement `app/page.tsx`**

```typescript
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">SmartResume</h1>
        <p className="text-xl text-gray-600 mb-2">
          Tailored, ATS-optimized resumes for every job you apply to.
        </p>
        <p className="text-gray-500 mb-10">
          Paste a job URL. Get a resume built around the role in seconds.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/apply"
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-md">
            Generate Resume
          </Link>
          <Link href="/profile"
            className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-lg hover:border-blue-400 hover:text-blue-700 transition-colors">
            Edit Profile
          </Link>
        </div>
      </div>
    </main>
  )
}
```

**Step 2: Verify http://localhost:3000 shows the home page with working nav links**

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add home page with navigation to profile and apply"
```

---

## Task 9: Final Polish & Layout

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Add a nav bar to the global layout**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SmartResume',
  description: 'AI-powered tailored resumes for every job application',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <Link href="/" className="text-xl font-bold text-blue-600">SmartResume</Link>
          <div className="flex gap-6 text-sm font-medium">
            <Link href="/apply" className="text-gray-600 hover:text-blue-600 transition-colors">Generate</Link>
            <Link href="/profile" className="text-gray-600 hover:text-blue-600 transition-colors">My Profile</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
```

**Step 2: Final end-to-end test**

1. Visit http://localhost:3000
2. Go to `/profile`, fill in a sample profile, save
3. Go to `/apply`, paste a job URL (or manual text)
4. Confirm resume generates with ATS score
5. Download PDF and verify it opens correctly

**Step 3: Final commit**

```bash
git add app/layout.tsx
git commit -m "feat: add nav bar to global layout"
```

---

## Done

The app is fully functional. Future improvements (out of scope for now):
- User auth + cloud storage
- Resume history
- Cover letter generation
- Multiple profile support
