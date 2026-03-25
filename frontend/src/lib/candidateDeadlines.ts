/** Client-side checks aligned with backend 24h windows (assessment, offer). AI interviews: 30-minute join window after scheduled start (matches token API). */

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

/** 30 minutes after scheduled start — matches backend `INTERVIEW_JOIN_WINDOW_MINUTES`. */
export const AI_INTERVIEW_JOIN_WINDOW_MS = 30 * 60 * 1000;

/** True if the join window has not expired (shows upcoming card; includes times before scheduled start). */
export function isAiInterviewJoinWindowNotExpired(scheduledAtIso: string): boolean {
  const end = new Date(scheduledAtIso).getTime() + AI_INTERVIEW_JOIN_WINDOW_MS;
  return Date.now() <= end;
}

/** True when now is in [scheduled_at, scheduled_at + 30min] — candidate may join. */
export function isAiInterviewJoinWindowActiveNow(scheduledAtIso: string): boolean {
  const start = new Date(scheduledAtIso).getTime();
  const end = start + AI_INTERVIEW_JOIN_WINDOW_MS;
  const now = Date.now();
  return now >= start && now <= end;
}

/** Hide Join once the interview is finished or a session summary exists (race while status updates). */
export function canJoinAiInterview(interview: {
  status: string;
  scheduled_at: string;
  session_summary?: string | null;
}): boolean {
  if (interview.session_summary) return false;
  if (['completed', 'cancelled', 'no_show'].includes(interview.status)) return false;
  if (interview.status !== 'scheduled') return false;
  return isAiInterviewJoinWindowNotExpired(interview.scheduled_at);
}

/** True when the Join button should navigate to the room (within window). */
export function canJoinAiInterviewNow(interview: {
  status: string;
  scheduled_at: string;
  session_summary?: string | null;
}): boolean {
  if (interview.session_summary) return false;
  if (['completed', 'cancelled', 'no_show'].includes(interview.status)) return false;
  if (interview.status !== 'scheduled') return false;
  return isAiInterviewJoinWindowActiveNow(interview.scheduled_at);
}
