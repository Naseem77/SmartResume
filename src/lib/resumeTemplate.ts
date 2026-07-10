import type { TailoredResume } from '@/types/resume'

export function buildResumeHtml(resume: TailoredResume): string {
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
