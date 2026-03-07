import logging
import threading
import time
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Resend rate limit: 20 requests per second (enforce min ~50ms between sends)
_resend_lock = threading.Lock()
_resend_last_send_time: float = 0
_RESEND_MIN_INTERVAL = 0.055  # seconds (1/18 to stay safely under 20/s)


def _send(to: str, subject: str, html: str) -> bool:
    settings = get_settings()
    if not settings.resend_api_key:
        logger.warning(
            "RESEND_API_KEY not set — email to %s skipped. Set RESEND_API_KEY in .env and verify your 'from' domain in Resend dashboard.",
            to,
        )
        return False
    logger.info("Sending email to %s: %s", to, subject)
    with _resend_lock:
        now = time.monotonic()
        elapsed = now - _resend_last_send_time
        if elapsed < _RESEND_MIN_INTERVAL:
            sleep_time = _RESEND_MIN_INTERVAL - elapsed
            logger.debug("Resend rate limit: sleeping %.2fs", sleep_time)
            time.sleep(sleep_time)
    try:
        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.email_from,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        with _resend_lock:
            global _resend_last_send_time
            _resend_last_send_time = time.monotonic()
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as e:
        logger.exception("Failed to send email to %s: %s", to, e)
        return False


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
