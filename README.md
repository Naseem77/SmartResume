<div align="center">

# SmartResume

**AI-powered resume tailoring and autonomous job application platform.**

*Tailor an ATS-verified resume for any job in seconds, or let the agent search, match, and apply for hours: all running privately on your machine.*

[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-35%20passing-brightgreen)](#quality--testing)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

</div>

---

## Overview

SmartResume eliminates the most time-consuming part of a job search: producing a high-quality, role-specific resume for every application. It maintains your professional profile locally, tailors an ATS-optimized resume per job posting with AI, and provides an autonomous agent that discovers, evaluates, and applies to matching roles on a schedule you control.

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

## Getting Started

**Prerequisites:** Node.js 20+ and an OpenAI or Anthropic API key.

```bash
# 1. Install
git clone https://github.com/Naseem77/SmartResume.git
cd SmartResume
npm install

# 2. Configure your LLM key
cp .env.local.example .env.local
# edit .env.local: set OPENAI_API_KEY or ANTHROPIC_API_KEY

# 3. Launch
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000):

1. **`/profile`**: enter your experience, education, and skills (or import from LinkedIn), and set your **Job Search Preferences**: titles, locations, keywords, job boards, score thresholds
2. **`/dashboard`**: press **▶ Start Agent** and choose how many hours to run

Prefer the terminal? The agent runs standalone:

```bash
npm run agent -- 3        # search and apply for 3 hours
```

The dashboard fills with matched jobs, each carrying a tailored, ATS-verified resume ready to go.

## Operating Modes

Set in `.env.local`:

| Mode | Behavior |
|---|---|
| `COLLECT_ONLY=true` *(recommended)* | The agent collects matched jobs with finished resumes. You review each on the dashboard and click **Apply Now** |
| `COLLECT_ONLY=false` | The agent applies automatically as it finds matches |

### Application Submission

The default submission handler is **record mode**: the finished resume and application record are saved and marked "Ready to submit", with the job posting one click away.

Optional LinkedIn Easy Apply automation:

```env
AUTO_APPLY=true
LINKEDIN_EMAIL=you@example.com
LINKEDIN_PASSWORD=...
```

Simple Easy Apply flows are completed end to end (resume upload and submit). Applications with custom questions are flagged "Needs manual step" with the resume prepared.

> **Compliance note:** automating logins and submissions may violate a job board's terms of service and can trigger security checks. Review mode with one-click apply is the recommended configuration. Use auto-submit at your own risk.

## Configuration Reference

All configuration lives in `.env.local` (see `.env.local.example`).

### AI Provider (required)

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

CLI flags override environment variables:

```bash
npm run agent -- --hours 3 --poll-minutes 15 --max-apps 5
```

### Job Boards

| Source | Access | Required variables |
|---|---|---|
| LinkedIn | Public guest search, no key | none |
| AllJobs | Best-effort public scrape | none |
| Indeed | Publisher API | `INDEED_PUBLISHER_ID` |
| Glassdoor | Partner API | `GLASSDOOR_PARTNER_ID`, `GLASSDOOR_API_KEY` |

Boards are toggled per user in the preferences UI.

### Auto-Submit (optional)

| Variable | Description |
|---|---|
| `AUTO_APPLY` | `true` enables LinkedIn Easy Apply automation |
| `LINKEDIN_EMAIL` / `LINKEDIN_PASSWORD` | LinkedIn credentials |
| `AUTO_APPLY_HEADLESS` | `false` to watch the browser while it applies |

## Data, Privacy & Audit Trail

Every application is fully auditable on disk:

```
data/
├── applications/<id>/         # application.json, resume.pdf, resume.html per job
├── agent-status.json          # live agent telemetry (powers the dashboard)
├── seen-jobs.json             # dedupe ledger of evaluated listings
└── agent.log                  # timestamped activity log

personaldata/
├── profile.json               # your base resume data
└── preferences.json           # titles, keywords, boards, thresholds
```

- `data/` and `personaldata/` are excluded from version control
- No accounts, no telemetry, no third-party storage
- The only outbound traffic is to your chosen LLM provider and the job boards themselves

## Quality & Testing

```bash
npm test          # 35 vitest tests
npm run lint      # ESLint
npm run build     # production build
```

The suite covers the persistence layer, job board parsers, match filtering, the ATS fix loop, the agent's time-boxed run loop, failure isolation (one bad job never kills a run), and the one-click apply flow.

## License

Apache 2.0. See [LICENSE](LICENSE).
