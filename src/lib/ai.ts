import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { Profile, GenerateResult } from '@/types/resume'

function buildPrompt(profile: Profile, jobDescription: string, jobTitle: string): string {
  return `You are an expert resume writer and ATS optimization specialist.

Given the candidate's base profile and a job description, create a tailored resume optimized for ATS (Applicant Tracking Systems) and the specific role.

## Candidate Profile
${JSON.stringify(profile, null, 2)}

## Job Title
${jobTitle}

## Job Description
${jobDescription}

## Instructions
1. Rewrite the summary to directly address this specific role. Write it in a natural, human voice — first person is fine, conversational but professional. Avoid AI-sounding phrases like "results-driven", "seasoned professional", "passionate about", "dynamic", "leverage", "spearhead", "synergy", or any corporate buzzwords. It should sound like the candidate wrote it themselves — specific, grounded, and genuine.
2. Reorder and rewrite experience bullets to highlight relevant achievements and incorporate job keywords naturally. Keep the language direct and human — avoid hollow filler words.
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
}

function parseJsonResponse(text: string): GenerateResult {
  const json = text
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/```$/m, '')
    .trim()
  return JSON.parse(json) as GenerateResult
}

async function generateWithClaude(profile: Profile, jobDescription: string, jobTitle: string): Promise<GenerateResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(profile, jobDescription, jobTitle) }],
  })
  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return parseJsonResponse(content.text)
}

async function generateWithOpenAI(profile: Profile, jobDescription: string, jobTitle: string): Promise<GenerateResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const model = process.env.OPENAI_MODEL || 'gpt-4o'
  const response = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(profile, jobDescription, jobTitle) }],
  })
  const text = response.choices[0]?.message?.content
  if (!text) throw new Error('Empty response from OpenAI')
  return parseJsonResponse(text)
}

export async function generateTailoredResume(
  profile: Profile,
  jobDescription: string,
  jobTitle: string
): Promise<GenerateResult> {
  const provider = process.env.AI_PROVIDER || 'claude'
  if (provider === 'openai') {
    return generateWithOpenAI(profile, jobDescription, jobTitle)
  }
  return generateWithClaude(profile, jobDescription, jobTitle)
}
