import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { Profile, GenerateResult } from '@/types/resume'
import { withRetry } from '@/lib/agent/retry'
import { resolveAiConfig } from '@/lib/settings'

export interface CompleteOptions {
  /** Override the model, e.g. a cheaper one for lightweight tasks. */
  model?: string
}

/** Sends a prompt to the configured provider and returns the raw text reply. Retries transient failures. */
export async function completeText(prompt: string, options: CompleteOptions = {}): Promise<string> {
  const config = await resolveAiConfig()
  return withRetry(async () => {
    if (config.provider === 'openai') {
      const client = new OpenAI({ apiKey: config.apiKey })
      const model = options.model || config.model || 'gpt-4o'
      const response = await client.chat.completions.create({
        model,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      })
      const text = response.choices[0]?.message?.content
      if (!text) throw new Error('Empty response from OpenAI')
      return text
    }
    const client = new Anthropic({ apiKey: config.apiKey })
    const message = await client.messages.create({
      model: options.model || config.model || 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
    return content.text
  })
}

/**
 * Model used for lightweight tasks (job fit matching). Defaults to a cheaper
 * model on OpenAI; override with MATCHER_MODEL.
 */
export function matcherModel(): string | undefined {
  if (process.env.MATCHER_MODEL) return process.env.MATCHER_MODEL
  const provider = process.env.AI_PROVIDER || 'claude'
  return provider === 'openai' ? 'gpt-4o-mini' : undefined
}

/** Generates a short tailored cover letter as plain text. */
export async function generateCoverLetter(
  profile: Profile,
  jobDescription: string,
  jobTitle: string,
  company: string
): Promise<string> {
  const prompt = `Write a short, natural cover letter (150-220 words) for this candidate applying to the role below. Sound human and specific, no corporate buzzwords ("passionate", "dynamic", "leverage"), no flattery. Ground every claim in the candidate's real experience.

## Candidate
${JSON.stringify({ name: profile.name, summary: profile.summary, skills: profile.skills, experience: profile.experience }, null, 2)}

## Role
${jobTitle} at ${company}

## Job Description
${jobDescription.slice(0, 5000)}

Respond with ONLY valid JSON: { "coverLetter": "..." }`
  const text = await completeText(prompt)
  const json = text.replace(/```json\s*/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(json)
  if (!parsed.coverLetter) throw new Error('Empty cover letter')
  return String(parsed.coverLetter)
}

function buildPrompt(profile: Profile, jobDescription: string, jobTitle: string, feedback?: string): string {
  return `You are an expert resume writer and ATS optimization specialist.

Given the candidate's base profile and a job description, create a tailored resume optimized for ATS (Applicant Tracking Systems) and the specific role.

## Candidate Profile
${JSON.stringify(profile, null, 2)}

## Job Title
${jobTitle}

## Job Description
${jobDescription}
${feedback ? `\n## Reviewer feedback on a previous attempt (address every point)\n${feedback}\n` : ''}
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
  // Strip markdown code fences anywhere in the string
  const json = text.replace(/```json\s*/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(json)

  // Ensure atsScore is present and all breakdown fields are valid numbers
  const score = parsed.atsScore ?? {}
  const breakdown = score.breakdown ?? {}
  parsed.atsScore = {
    score: Number(score.score) || 0,
    breakdown: {
      keywordMatch: Number(breakdown.keywordMatch) || 0,
      sectionCompleteness: Number(breakdown.sectionCompleteness) || 0,
      formattingCompliance: Number(breakdown.formattingCompliance) || 0,
      relevance: Number(breakdown.relevance) || 0,
    },
    suggestions: Array.isArray(score.suggestions) ? score.suggestions : [],
  }

  return parsed as GenerateResult
}

export async function generateTailoredResume(
  profile: Profile,
  jobDescription: string,
  jobTitle: string,
  feedback?: string
): Promise<GenerateResult> {
  const text = await completeText(buildPrompt(profile, jobDescription, jobTitle, feedback))
  return parseJsonResponse(text)
}
