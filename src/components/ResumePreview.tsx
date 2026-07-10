import type { TailoredResume } from '@/types/resume'

export default function ResumePreview({ resume }: { resume: TailoredResume }) {
  const contact = [resume.email, resume.phone, resume.location, resume.linkedin, resume.website].filter(Boolean)

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm p-8 text-sm leading-relaxed text-gray-900 dark:text-zinc-100 space-y-5 font-serif">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{resume.name}</h1>
        <p className="text-gray-500 dark:text-zinc-400 text-xs mt-1">{contact.join(' • ')}</p>
      </div>

      {resume.summary && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 border-b border-gray-200 dark:border-zinc-800 pb-1 mb-2">Summary</h2>
          <p className="text-gray-700 dark:text-zinc-300">{resume.summary}</p>
        </div>
      )}

      {resume.experience.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 border-b border-gray-200 dark:border-zinc-800 pb-1 mb-3">Experience</h2>
          {resume.experience.map((exp, i) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-zinc-100">{exp.title}</span>
                  <span className="text-gray-600 dark:text-zinc-400"> — {exp.company}{exp.location ? `, ${exp.location}` : ''}</span>
                </div>
                <span className="text-gray-400 dark:text-zinc-500 text-xs whitespace-nowrap ml-4">{exp.dates}</span>
              </div>
              <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-gray-700 dark:text-zinc-300">
                {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {resume.education.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 border-b border-gray-200 dark:border-zinc-800 pb-1 mb-3">Education</h2>
          {resume.education.map((edu, i) => (
            <div key={i} className="flex justify-between items-start">
              <span>
                <span className="font-semibold">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</span>
                <span className="text-gray-600 dark:text-zinc-400"> — {edu.school}</span>
              </span>
              <span className="text-gray-400 dark:text-zinc-500 text-xs ml-4">{edu.dates}</span>
            </div>
          ))}
        </div>
      )}

      {resume.skills.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 border-b border-gray-200 dark:border-zinc-800 pb-1 mb-2">Skills</h2>
          <p className="text-gray-700 dark:text-zinc-300">{resume.skills.join(' • ')}</p>
        </div>
      )}

      {resume.projects.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 border-b border-gray-200 dark:border-zinc-800 pb-1 mb-3">Projects</h2>
          {resume.projects.map((proj, i) => (
            <div key={i} className="mb-3">
              <span className="font-semibold text-gray-900 dark:text-zinc-100">{proj.name}</span>
              {proj.url && <span className="text-gray-400 dark:text-zinc-500 text-xs ml-2">{proj.url}</span>}
              <p className="text-gray-700 dark:text-zinc-300 mt-0.5">{proj.description}</p>
              {proj.technologies.length > 0 && (
                <p className="text-gray-400 dark:text-zinc-500 text-xs mt-0.5">{proj.technologies.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
