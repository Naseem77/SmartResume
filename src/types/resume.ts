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
