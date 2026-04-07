# SmartResume

AI-powered resume tailoring. Paste a job URL, get a tailored, ATS-optimized resume in seconds — powered by Claude or OpenAI.

## How it works

1. **Set up your profile** — enter your experience, education, skills, and projects once at `/profile`
2. **Paste a job URL** — SmartResume scrapes the job description automatically (LinkedIn, Glassdoor, Greenhouse, Lever, etc.). If scraping fails, paste the description manually
3. **Generate** — AI rewrites your resume to match the role: keywords matched, bullets rewritten, skills prioritized
4. **Download** — clean, ATS-safe PDF ready to submit. ATS score shown on screen (not in the PDF)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

**Using OpenAI:**
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

**Using Claude (Anthropic):**
```env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Home
│   ├── profile/page.tsx      # Profile editor
│   ├── apply/page.tsx        # Generate resume flow
│   └── api/
│       ├── profile/          # Read/write profile.json
│       ├── scrape/           # Fetch job description from URL
│       ├── generate/         # AI resume + ATS score
│       └── pdf/              # Puppeteer PDF export
├── components/
│   ├── ProfileForm.tsx       # Multi-section profile editor
│   ├── JobInput.tsx          # URL input + manual fallback
│   ├── ResumePreview.tsx     # Resume preview
│   └── AtsScore.tsx          # ATS score card
└── lib/
    ├── ai.ts                 # Claude + OpenAI provider
    ├── scraper.ts            # Cheerio scraper
    └── resumeTemplate.ts     # ATS-safe HTML/PDF template

personaldata/
└── profile.json              # Your base resume data (local, not committed)
```

## ATS score

After generation, the app shows a score (0–100) broken down across:

- **Keyword match** — how well your resume keywords match the job description
- **Section completeness** — presence of Summary, Experience, Education, Skills
- **Formatting compliance** — ATS-safe formatting practices
- **Role relevance** — overall fit of your experience to the role

The score is displayed on screen only — the downloaded PDF stays clean.

## Tech stack

- [Next.js 14](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com)
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) / [OpenAI SDK](https://github.com/openai/openai-node)
- [Cheerio](https://cheerio.js.org) — job page scraping
- [Puppeteer](https://pptr.dev) — PDF generation
