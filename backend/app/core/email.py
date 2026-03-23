import asyncio
import logging
import threading
import time
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Resend rate limit: 20 requests per second (enforce min ~50ms between sends)
_resend_lock = threading.Lock()
_resend_last_send_time: float = 0
_RESEND_MIN_INTERVAL = 0.055  # seconds (1/18 to stay safely under 20/s)

# Placeholder values that indicate the key is not configured
_PLACEHOLDER_KEYS = {"re_xxxxxxxxxxxx", "re_placeholder", ""}


def _send(to: str, subject: str, html: str) -> bool:
    global _resend_last_send_time
    settings = get_settings()
    api_key = settings.resend_api_key or ""

    if not api_key or api_key in _PLACEHOLDER_KEYS:
        logger.warning(
            "RESEND_API_KEY not configured — email to %s skipped. "
            "Set a real RESEND_API_KEY in Azure Application settings and verify the 'from' domain in Resend dashboard.",
            to,
        )
        return False

    logger.info("Sending email to %s: %s (from: %s)", to, subject, settings.email_from)
    with _resend_lock:
        now = time.monotonic()
        elapsed = now - _resend_last_send_time
        if elapsed < _RESEND_MIN_INTERVAL:
            sleep_time = _RESEND_MIN_INTERVAL - elapsed
            logger.debug("Resend rate limit: sleeping %.2fs", sleep_time)
            time.sleep(sleep_time)
    try:
        import resend
        resend.api_key = api_key
        resend.Emails.send({
            "from": settings.email_from,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        with _resend_lock:
            _resend_last_send_time = time.monotonic()
        logger.info("Email sent successfully to %s: %s", to, subject)
        return True
    except Exception as e:
        logger.error(
            "Failed to send email to %s (%s). Error: %s. "
            "Check RESEND_API_KEY validity and that domain '%s' is verified in Resend dashboard.",
            to, subject, e, settings.email_from.split("@")[-1] if "@" in settings.email_from else settings.email_from,
        )
        return False


async def send_async(to: str, subject: str, html: str) -> bool:
    """Non-blocking wrapper: runs _send in a thread so async handlers are not blocked."""
    return await asyncio.to_thread(_send, to, subject, html)


def notify_recruiter_new_application(
    recruiter_email: str, candidate_name: str, job_title: str
):
    _send(
        to=recruiter_email,
        subject=f"New application for {job_title}",
        html=f"""
        <h2>New Application Received</h2>
        <p><strong>{candidate_name}</strong> has applied for <strong>{job_title}</strong>.</p>
        <p>Log in to <a href="https://hire-base.vercel.app/recruiter/candidates">Agentic HR</a> to review the application.</p>
        """,
    )


def notify_candidate_status_change(
    candidate_email: str, job_title: str, new_status: str
):
    status_messages = {
        "assessment": "You have been shortlisted for an assessment",
        "interview": "You have been selected for an interview",
        "selected": "Congratulations! You have been selected",
        "rejected": "Unfortunately, your application was not selected",
    }
    message = status_messages.get(new_status, f"Your application status changed to: {new_status}")
    _send(
        to=candidate_email,
        subject=f"Application update: {job_title}",
        html=f"""
        <h2>Application Status Update</h2>
        <p>Regarding your application for <strong>{job_title}</strong>:</p>
        <p>{message}.</p>
        <p>View your applications at <a href="https://hire-base.vercel.app/candidate/applications">Agentic HR</a>.</p>
        """,
    )


def notify_candidate_rejected(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
):
    """Send a professional rejection email to the candidate."""
    from app.core.config import get_settings
    base = get_settings().frontend_url.rstrip("/")
    jobs_link = f"{base}/jobs"
    _send(
        to=candidate_email,
        subject=f"Your application for {job_title}",
        html=f"""
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;">
          <h2 style="margin-bottom:8px;">Application Update</h2>
          <p>Hi {candidate_name},</p>
          <p>Thank you for taking the time to apply for the <strong>{job_title}</strong> position and for
          completing our interview process. We genuinely appreciate your interest and the effort you put in.</p>
          <p>After careful consideration, we have decided to move forward with other candidates whose experience
          more closely matches the requirements for this role at this time.</p>
          <p>This decision does not reflect on your abilities or potential — the competition for this role was
          strong. We encourage you to apply for future openings that align with your skills.</p>
          <p style="margin-top:24px;">
            <a href="{jobs_link}"
               style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;
                      border-radius:8px;text-decoration:none;font-weight:600;">
              Browse Open Positions
            </a>
          </p>
          <p style="margin-top:24px;color:#6b7280;font-size:14px;">
            We wish you all the best in your job search.<br/>
            — The Hiring Team
          </p>
        </div>
        """,
    )


def notify_candidate_application_received(candidate_email: str, job_title: str):
    _send(
        to=candidate_email,
        subject=f"Application received: {job_title}",
        html=f"""
        <h2>Application Submitted Successfully</h2>
        <p>Your application for <strong>{job_title}</strong> has been received.</p>
        <p>You will be notified when there are updates. Track your applications at
        <a href="https://hire-base.vercel.app/candidate/applications">Agentic HR</a>.</p>
        """,
    )


def notify_candidate_interview_scheduled(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    scheduled_at_str: str,
    duration_minutes: int,
    interview_id: str,
):
    """Notify candidate that an AI interview has been scheduled for them."""
    from app.core.config import get_settings
    base = get_settings().frontend_url.rstrip("/")
    join_link = f"{base}/interview/room/{interview_id}"
    _send(
        to=candidate_email,
        subject=f"AI Interview scheduled: {job_title}",
        html=f"""
        <h2>Your AI Interview is Scheduled</h2>
        <p>Hi {candidate_name},</p>
        <p>An AI-powered video interview has been scheduled for your application to <strong>{job_title}</strong>.</p>
        <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0;"><strong>When:</strong> {scheduled_at_str}</p>
          <p style="margin:8px 0 0;"><strong>Duration:</strong> {duration_minutes} minutes</p>
        </div>
        <p>You can join the interview from 15 minutes before the scheduled time. Have your camera and microphone ready.</p>
        <p><a href="{join_link}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Join Interview</a></p>
        <p>Or copy this link: <a href="{join_link}">{join_link}</a></p>
        <p>You must be logged in to join. Good luck!</p>
        """,
    )


def notify_candidate_in_person_scheduled(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    scheduled_at_str: str,
    notes: str | None = None,
):
    """Notify candidate that an in-person interview has been scheduled."""
    from app.core.config import get_settings
    base = get_settings().frontend_url.rstrip("/")
    apps_link = f"{base}/candidate/applications"
    notes_html = f"<p><strong>Notes:</strong> {notes}</p>" if notes else ""
    _send(
        to=candidate_email,
        subject=f"In-person interview scheduled: {job_title}",
        html=f"""
        <h2>In-Person Interview Scheduled</h2>
        <p>Hi {candidate_name},</p>
        <p>You have been invited for an <strong>in-person interview</strong> for your application to <strong>{job_title}</strong>.</p>
        <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0;"><strong>When:</strong> {scheduled_at_str}</p>
        </div>
        {notes_html}
        <p>Please be on time. If you need to reschedule, contact the recruiter.</p>
        <p>View your applications at <a href="{apps_link}">Agentic HR</a>.</p>
        """,
    )


def notify_candidate_offer_letter(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    company_name: str = "the company",
):
    """Send offer letter notification email to the candidate."""
    from app.core.config import get_settings
    base = get_settings().frontend_url.rstrip("/")
    _send(
        to=candidate_email,
        subject=f"Offer letter: {job_title}",
        html=f"""
        <h2>Congratulations – Offer Letter</h2>
        <p>Hi {candidate_name},</p>
        <p>We are pleased to extend an offer of employment for the position of <strong>{job_title}</strong> at {company_name}.</p>
        <p>Please log in to your account to view the full offer details and next steps.</p>
        <p><a href="{base}/candidate/applications" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View my applications</a></p>
        <p>We look forward to welcoming you to the team.</p>
        """,
    )


def notify_candidate_offer_accepted(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
):
    """Confirmation email when candidate accepts the offer."""
    from app.core.config import get_settings
    base = get_settings().frontend_url.rstrip("/")
    _send(
        to=candidate_email,
        subject=f"Offer accepted: {job_title}",
        html=f"""
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;">
          <h2 style="color:#059669;margin-bottom:8px;">Welcome aboard!</h2>
          <p>Hi {candidate_name},</p>
          <p>Thank you for accepting the offer for <strong>{job_title}</strong>. We are thrilled to have you join the team!</p>
          <p>Our HR team will be in touch shortly with onboarding details and next steps.</p>
          <p style="margin-top:24px;">
            <a href="{base}/candidate/applications"
               style="display:inline-block;background:#059669;color:white;padding:12px 24px;
                      border-radius:8px;text-decoration:none;font-weight:600;">
              View my applications
            </a>
          </p>
          <p style="margin-top:24px;color:#6b7280;font-size:14px;">
            We look forward to working with you.<br/>
            — The Hiring Team
          </p>
        </div>
        """,
    )


def notify_candidate_assessment(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    assessment_name: str,
    duration_minutes: int,
    assessment_id: str,
    application_id: str,
):
    from app.core.config import get_settings
    base = get_settings().frontend_url.rstrip("/")
    assessment_link = f"{base}/assessment/attempt/{assessment_id}?application_id={application_id}"
    _send(
        to=candidate_email,
        subject=f"Assessment for {job_title}: {assessment_name}",
        html=f"""
        <h2>Assessment Invitation</h2>
        <p>Hi {candidate_name},</p>
        <p>As part of your application for <strong>{job_title}</strong>, you are invited to complete
        the following assessment:</p>
        <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0;font-weight:bold;">{assessment_name}</p>
          <p style="margin:4px 0 0;color:#6b7280;">Duration: {duration_minutes} minutes</p>
        </div>
        <p><a href="{assessment_link}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Attempt Assessment</a></p>
        <p>Or copy this link: <a href="{assessment_link}">{assessment_link}</a></p>
        <p>You must be logged in to attempt. Good luck!</p>
        """,
    )
