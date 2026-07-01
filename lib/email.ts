import { Resend } from 'resend'
import type { ClaudeMorphoAnalysis } from '@/lib/claude'

export interface EmailResult {
  sent: boolean
  id?: string
  reason?: string
}

/**
 * Send the weekly morpho advice by email via Resend.
 * No-ops gracefully (sent: false) when RESEND_API_KEY / COACH_EMAIL_TO are absent,
 * so an unconfigured environment never breaks the analysis flow.
 */
export async function sendAdviceEmail(opts: { subject: string; html: string; to?: string }): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const to = opts.to ?? process.env.COACH_EMAIL_TO
  const from = process.env.COACH_EMAIL_FROM ?? 'Coach AI <onboarding@resend.dev>'

  if (!apiKey || !to) {
    return { sent: false, reason: 'RESEND_API_KEY or COACH_EMAIL_TO not configured' }
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({ from, to, subject: opts.subject, html: opts.html })
    if (error) return { sent: false, reason: error.message }
    return { sent: true, id: data?.id }
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : 'Unknown email error' }
  }
}

/** Render the morpho analysis as a simple, readable HTML email. */
export function renderAdviceEmail(analysis: ClaudeMorphoAnalysis, weekLabel: string): { subject: string; html: string } {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const segments = analysis.segments
    .map((s) => `<li><strong>${esc(s.name)}:</strong> ${esc(s.assessment)}</li>`)
    .join('')

  const advice = analysis.advice
    .map((a) => {
      const ex = a.exercise ? `<strong>${esc(a.exercise)}</strong> — ` : ''
      const reason = a.reason ? `<br><em style="color:#666">${esc(a.reason)}</em>` : ''
      return `<li>${ex}${esc(a.recommendation)}${reason}</li>`
    })
    .join('')

  const progression = analysis.progression
    ? `<h3>Progression</h3><p>${esc(analysis.progression)}</p>`
    : ''

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;color:#18181b">
    <h2>Analyse morpho — ${esc(weekLabel)}</h2>
    <p>${esc(analysis.summary)}</p>
    <h3>Proportions / segments</h3>
    <ul>${segments || '<li>—</li>'}</ul>
    <h3>Conseils pour adapter tes exercices</h3>
    <ul>${advice || '<li>—</li>'}</ul>
    ${progression}
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0">
    <p style="color:#71717a;font-size:12px">Coach AI — analyse basée sur tes photos et tes exercices Hevy.</p>
  </div>`

  return { subject: `Analyse morpho — ${weekLabel}`, html }
}
