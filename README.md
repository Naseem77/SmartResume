# SmartResume

**AI-powered resume tailoring and autonomous job application platform.**

SmartResume turns your professional profile into a job-hunting machine. It tailors an ATS-optimized resume for any job posting on demand, and its autonomous agent can search job boards for hours, match listings against your profile, generate a verified resume for each one, and apply: all running locally on your machine.

---

## Key Capabilities

| Capability | Description |
|---|---|
| **Resume Tailoring** | AI rewrites your resume per job: keywords matched, bullets rewritten, skills prioritized |
| **ATS Verification** | Every resume is scored (0-100) and automatically regenerated with feedback until it clears your threshold |
| **Autonomous Agent** | Runs for a set number of hours, searching, matching, generating, and applying without supervision |
| **Multi-Board Search** | LinkedIn and AllJobs out of the box (no keys), Indeed and Glassdoor via API keys |
| **Review or Auto Mode** | Collect matches for one-click approval, or let the agent apply as it goes |
| **Application Tracking** | Dashboard with live agent telemetry, statuses, fit scores, ATS breakdowns, and resume PDFs |
| **Local-First Data** | Everything stays on your machine: no cloud, no account, full audit trail in `data/` |

## How It Works

```
Profile + Preferences          The Agent Loop                       Your Review
┌──────────────────┐   ┌─────────────────────────────────┐   ┌──────────────────┐
│ Experience       │   │ 1. Search job boards            │   │ Dashboard        │
│ Skills           │──▶│ 2. Filter by keywords           │──▶│ · Live telemetry │
│ Job titles       │   │ 3. LLM fit score vs profile     │   │ · Fit + ATS      │
│ Keywords         │   │ 4. Tailor resume, ATS check     │   │ · Resume PDF     │
│ Score thresholds │   │ 5. Fix until threshold met      │   │ · One-click      │
└──────────────────┘   │ 6. Apply or collect, save all   │   │   Apply Now      │
                       └─────────────────────────────────┘   └──────────────────┘
```

## Quick Start

**Prerequisites:** Node.js 20+, an OpenAI or Anthropic API key.

```bash
# 1. Install
git clone https://github.com/Naseem77/SmartResume.git
cd SmartResume
npm install

# 2. Configure (add your LLM key)
cp .env.local.example .env.local
# edit .env.local: set OPENAI_API_KEY or ANTHROPIC_API_KEY

# 3. Launch
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then:

1. **`/profile`**: fill in your experience, education, and skills (or import from LinkedIn), and set your **Job Search Preferences**: titles, locations, keywords, job boards, score thresholds
2. **`/dashboard`**: press **▶ Start Agent** and choose how many hours to run

Or run the agent from the terminal:

```bash
npm run agent -- 3        # hunt for 3 hours
```

That's it. The dashboard fills up with matched jobs, each with a tailored, ATS-verified resume ready to go.

## Operating Modes

Set in `.env.local`:

```env
COLLECT_ONLY=true    # review mode (default, recommended)
```

| Mode | Behavior |
|---|---|
| `COLLECT_ONLY=true` | Agent collects matched jobs with finished resumes. You review each on the dashboard and click **Apply Now** |
| `COLLECT_ONLY=false` | Agent applies automatically as it finds matches |

### Applying

The default applier is **record mode**: the finished resume and application record are saved, marked "Ready to submit", with the job link one click away.

Optional LinkedIn Easy Apply auto-submit:

```env
AUTO_APPLY=true
LINKEDIN_EMAIL=you@example.com
LINKEDIN_PASSWORD=...
```

It completes simple Easy Apply flows (resume upload and submit). Applications with custom questions are marked "Needs manual step" with the resume ready.

> **Compliance note:** automating logins and submissions may violate a job board's terms of service and can trigger security checks. Review mode with one-click apply is the recommended configuration. Use auto-submit at your own risk.

## Configuration Reference

All configuration lives in `.env.local` (see `.env.local.example`).

### AI provider (required)

| Variable | Description |
|---|---|
| `AI_PROVIDER` | `claude` (default) or `openai` |
| `ANTHROPIC_API_KEY` | Required when using Claude |
| `OPENAI_API_KEY` | Required when using OpenAI |
| `OPENAI_MODEL` | Defaults to `gpt-4o` |

### Agent

| Variable | Default | Description |
|---|---|---|
| `COLLECT_ONLY` | `false` | `true` = collect for review, `false` = auto-apply |
| `AGENT_RUN_HOURS` | | Default run length when not passed on the CLI |
| `AGENT_POLL_MINUTES` | `20` | Minutes between search cycles |
| `AGENT_MAX_APPLICATIONS` | `10` | Stop after this many applications per run |

CLI flags override env vars: `npm run agent -- --hours 3 --poll-minutes 15 --max-apps 5`

### Job boards

| Source | Access | Required variables |
|---|---|---|
| LinkedIn | Public guest search, no key | none |
| AllJobs | Best-effort public scrape | none |
| Indeed | Publisher API | `INDEED_PUBLISHER_ID` |
| Glassdoor | Partner API | `GLASSDOOR_PARTNER_ID`, `GLASSDOOR_API_KEY` |

Boards are toggled per-user in the preferences UI.

### Auto-submit (optional)

| Variable | Description |
|---|---|
| `AUTO_APPLY` | `true` enables LinkedIn Easy Apply automation |
| `LINKEDIN_EMAIL` / `LINKEDIN_PASSWORD` | LinkedIn credentials |
| `AUTO_APPLY_HEADLESS` | `false` to watch the browser while it applies |

## Data & Audit Trail

Every application is fully auditable on disk:

```
data/
├── applications/
│   └── 2026-07-10T14-05-11_acme_frontend-engineer_x7k2/
│       ├── application.json   # job, status, fit score, ATS breakdown, resume JSON
│       ├── resume.pdf         # the exact resume submitted for this job
│       └── resume.html
├── agent-status.json          # live agent telemetry (powers the dashboard)
├── seen-jobs.json             # dedupe ledger of evaluated listings
└── agent.log                  # timestamped activity log

personaldata/
├── profile.json               # your base resume data
└── preferences.json           # titles, keywords, boards, thresholds
```

`data/` and `personaldata/` are gitignored. Nothing leaves your machine except calls to your chosen LLM provider and the job boards themselves.

## Quality & Testing

```bash
npm test          # 35 vitest tests: store, sources, matcher, pipeline, runner, apply
npm run lint      # ESLint
npm run build     # production build
```

The test suite covers the persistence layer, job board parsers, match filtering, the ATS fix loop, the agent's time-boxed run loop, failure isolation (one bad job never kills a run), and the one-click apply flow.

## Architecture

```
scripts/
└── agent.ts                  # CLI entry: npm run agent -- <hours>
src/
├── app/
│   ├── profile/              # Profile + job search preferences
│   ├── apply/                # Manual single-job generate flow
│   ├── dashboard/            # Applications dashboard + agent controls
│   └── api/
│       ├── agent/            # Start / stop / status
│       ├── applications/     # List, resume PDFs, one-click apply
│       ├── preferences/      # Search preferences
│       ├── profile/          # Base resume data
│       ├── scrape/           # Job description fetcher
│       ├── generate/         # AI resume + ATS score
│       └── pdf/              # PDF export
├── components/               # ProfileForm, PreferencesForm, previews
└── lib/
    ├── ai.ts                 # Claude + OpenAI provider abstraction
    ├── pdf.ts                # Puppeteer PDF rendering
    ├── scraper.ts            # Job page scraper
    ├── resumeTemplate.ts     # ATS-safe HTML template
    └── agent/
        ├── runner.ts         # Time-boxed agent loop with live status
        ├── pipeline.ts       # tailor → ATS check → PDF → apply → persist
        ├── matcher.ts        # keyword prefilter + LLM fit scoring
        ├── store.ts          # data/ persistence layer
        ├── sources/          # linkedin · alljobs · indeed · glassdoor
        └── appliers/         # record (default) · linkedin easy apply
```

**Stack:** Next.js (App Router, TypeScript) · Tailwind CSS · Anthropic / OpenAI SDKs · Cheerio · Puppeteer · Vitest · tsx

## License

Apache 2.0. See [LICENSE](LICENSE).
