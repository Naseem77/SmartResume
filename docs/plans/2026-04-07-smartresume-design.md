# SmartResume — Design Document
**Date:** 2026-04-07  
**Status:** Approved

---

## Overview

SmartResume is a web app that generates tailored, ATS-optimized resumes for specific job postings. The user maintains a base profile of their experience, education, skills, and projects. When applying for a job, they provide a URL (or paste the job description manually), and the system generates a customized resume using Claude AI, displays an ATS score, and allows the user to download a clean PDF.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS (polished, modern UI) |
| AI | Claude API (resume tailoring + ATS scoring) |
| Scraping | Cheerio + native fetch |
| PDF | Puppeteer (server-side) |
| Data | Local `personaldata/profile.json` |

---

## Project Structure

```
SmartResume/
├── app/
│   ├── page.tsx                  # Home / dashboard
│   ├── profile/page.tsx          # Base profile editor
│   └── apply/page.tsx            # Job application flow
├── app/api/
│   ├── profile/route.ts          # GET/POST profile.json
│   ├── scrape/route.ts           # Fetch + parse job URL
│   ├── generate/route.ts         # Claude: tailor resume + ATS score
│   └── pdf/route.ts              # Puppeteer PDF generation
├── components/
│   ├── ProfileForm.tsx           # Multi-section profile editor
│   ├── JobInput.tsx              # URL input + manual paste fallback
│   ├── ResumePreview.tsx         # Rendered resume output
│   ├── AtsScore.tsx              # ATS score display card
│   └── DownloadButton.tsx        # Triggers PDF download
├── lib/
│   ├── claude.ts                 # Claude API client + prompts
│   ├── scraper.ts                # Cheerio scraping logic
│   └── resumeTemplate.ts         # ATS-safe HTML template for PDF
├── personaldata/
│   └── profile.json              # User's base resume data
└── public/
```

---

## Pages

### `/` — Home / Dashboard
- Brief intro and two CTAs: "Edit My Profile" and "Generate Resume"
- Shows last generated resume if available

### `/profile` — Profile Editor
- Form with sections: Personal Info, Experience, Education, Skills, Projects
- Add/remove entries dynamically
- Save button writes to `personaldata/profile.json` via `POST /api/profile`

### `/apply` — Job Application Flow
- Step 1: Paste job URL → hits `/api/scrape`
  - On success: shows extracted job title + description for review
  - On failure: shows manual paste textarea
- Step 2: User confirms job description → clicks "Generate Resume"
  - Calls `/api/generate` with profile + job description
  - Shows loading state
- Step 3: Results page
  - Resume preview (clean, readable layout)
  - ATS score card (score 0–100 with breakdown)
  - "Download PDF" button → calls `/api/pdf`

---

## Data Flow

```
User fills profile → saved to personaldata/profile.json
User pastes job URL → /api/scrape → job description text
                              ↓ (on failure)
                       manual paste fallback
Job description + profile.json → /api/generate → Claude API
Claude returns → { resume: {...}, atsScore: { score: 85, breakdown: {...} } }
Resume rendered in browser → ATS score displayed on page
User clicks Download → /api/pdf → Puppeteer → PDF binary → browser download
```

---

## Profile Data Schema (`personaldata/profile.json`)

```json
{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "website": "",
  "summary": "",
  "experience": [
    {
      "company": "",
      "title": "",
      "location": "",
      "dates": "",
      "bullets": []
    }
  ],
  "education": [
    {
      "school": "",
      "degree": "",
      "field": "",
      "dates": ""
    }
  ],
  "skills": [],
  "projects": [
    {
      "name": "",
      "description": "",
      "technologies": [],
      "url": ""
    }
  ]
}
```

---

## Claude Integration

### Resume Generation Prompt
Claude receives:
- Full `profile.json`
- Job title + full job description

Claude is instructed to:
- Reorder and rewrite bullets to match job keywords
- Tailor the summary to the specific role
- Select the most relevant skills and projects
- Use standard ATS-safe section headings
- Return structured JSON (not markdown)

### ATS Score
Returned alongside the resume in the same API call:
```json
{
  "score": 82,
  "breakdown": {
    "keywordMatch": 85,
    "sectionCompleteness": 90,
    "formattingCompliance": 75,
    "relevance": 80
  },
  "suggestions": ["Add more keywords from the job description", "..."]
}
```
Displayed on the `/apply` results page only — not included in the PDF.

---

## PDF Generation

- `/api/pdf` receives the tailored resume JSON
- Renders it using an ATS-safe HTML template (`lib/resumeTemplate.ts`)
  - Single-column layout
  - Standard fonts (Arial/Helvetica)
  - No tables, columns, images, or graphics
  - 1-inch margins, clean typography
- Puppeteer renders headlessly and returns PDF binary
- Browser triggers file download as `resume-[job-title].pdf`

---

## Scraping Strategy

1. `fetch` the job URL with a browser-like User-Agent header
2. Parse with Cheerio: extract `<title>`, `<h1>`, and main content blocks
3. If fetch fails (blocked, 403, timeout) → surface manual paste UI
4. Supported with best-effort: LinkedIn, Glassdoor, Greenhouse, Lever, Workday, plain job pages

---

## UI/UX Notes

- Polished, modern design using Tailwind CSS
- Clean multi-step flow on `/apply` with clear progress indication
- ATS score displayed as a prominent score card with color-coded breakdown
- Responsive layout (desktop-first, mobile-friendly)
- Loading states on all async actions

---

## Out of Scope (for now)

- User authentication / accounts
- Cloud storage of resumes
- Resume history / versioning
- Multiple profile support
- Cover letter generation
