import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _send(to: str, subject: str, html: str) -> bool:
    settings = get_settings()
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — email to %s skipped", to)
        return False
    try:
        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.email_from,
            "to": [to],
            "subject": subject,
            "html": html,
        })
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
