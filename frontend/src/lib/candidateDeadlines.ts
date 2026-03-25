/** Client-side checks aligned with backend 24h windows (assessment, offer). Interviews: join valid until scheduled_at + 24h. */

export type AppWithAssessmentDeadline = {
  job_has_assessment?: boolean;
  assessment_id?: string | null;
  assessment_score?: number | null;
  assessment_deadline_at?: string | null;
  applied_at: string;
  status: string;
};

export function isAssessmentPendingAndOpen(app: AppWithAssessmentDeadline): boolean {
  if (!app.job_has_assessment || !app.assessment_id) return false;
  if (app.assessment_score != null && app.assessment_score !== undefined) return false;
  if (['rejected', 'withdrawn', 'hired', 'interview', 'selected'].includes(app.status)) return false;
  const endMs = app.assessment_deadline_at
    ? new Date(app.assessment_deadline_at).getTime()
    : new Date(app.applied_at).getTime() + 24 * 60 * 60 * 1000;
  return Date.now() <= endMs;
}

export type AppWithOfferDeadline = {
  offer_sent_at?: string | null;
  offer_response_deadline_at?: string | null;
  status: string;
};

export function isOfferResponseOpen(app: AppWithOfferDeadline): boolean {
  if (!app.offer_sent_at) return false;
  if (app.status === 'hired' || app.status === 'withdrawn') return false;
  const endMs = app.offer_response_deadline_at
    ? new Date(app.offer_response_deadline_at).getTime()
    : new Date(app.offer_sent_at).getTime() + 24 * 60 * 60 * 1000;
  return Date.now() <= endMs;
}

/** AI interview join window ends 24h after scheduled start (matches backend). */
export function isInterviewJoinWindowOpen(scheduledAtIso: string): boolean {
  const end = new Date(scheduledAtIso).getTime() + 24 * 60 * 60 * 1000;
  return Date.now() <= end;
}
