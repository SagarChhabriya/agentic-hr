import logging
import time
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _get_supabase():
    from supabase import create_client
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    return create_client(settings.supabase_url, settings.supabase_service_key)


def upload_resume(file_bytes: bytes, user_id: str, filename: str) -> str:
    """Upload a resume to Supabase Storage and return the public URL."""
    settings = get_settings()
    client = _get_supabase()
    ts = int(time.time())
    safe_name = filename.replace(" ", "_")
    path = f"{user_id}/{ts}_{safe_name}"
    client.storage.from_(settings.supabase_bucket).upload(
        path, file_bytes, {"content-type": "application/pdf", "upsert": "true"}
    )
    result = client.storage.from_(settings.supabase_bucket).get_public_url(path)
    logger.info("Uploaded resume for user %s: %s", user_id, path)
    return result


def delete_resume(url: str) -> None:
    """Delete a resume from Supabase Storage given its URL."""
    settings = get_settings()
    client = _get_supabase()
    bucket = settings.supabase_bucket
    # Extract path from URL: .../storage/v1/object/public/resumes/user_id/file
    marker = f"/object/public/{bucket}/"
    idx = url.find(marker)
    if idx < 0:
        logger.warning("Could not parse storage path from URL: %s", url)
        return
    path = url[idx + len(marker):]
    client.storage.from_(bucket).remove([path])
    logger.info("Deleted resume: %s", path)
