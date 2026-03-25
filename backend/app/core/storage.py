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


def _ensure_bucket(client, bucket_name: str) -> None:
    """Create the storage bucket if it doesn't exist."""
    try:
        client.storage.get_bucket(bucket_name)
    except Exception:
        try:
            client.storage.create_bucket(bucket_name, options={"public": True})
            logger.info("Created Supabase bucket: %s", bucket_name)
        except Exception as e:
            if "already exists" not in str(e).lower():
                logger.warning("Could not create bucket %s: %s", bucket_name, e)


def upload_resume(file_bytes: bytes, user_id: str, filename: str) -> str:
    """Upload a resume to Supabase Storage and return the public URL."""
    settings = get_settings()
    client = _get_supabase()
    _ensure_bucket(client, settings.supabase_bucket)
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


INTERVIEW_RECORDINGS_BUCKET = "interview-recordings"
INTERVIEW_RECORDING_MAX_BYTES = 512 * 1024 * 1024  # 512 MB


def upload_interview_recording_bytes(storage_path: str, file_bytes: bytes) -> None:
    """Upload a WebM recording to the interview-recordings bucket (service role)."""
    if len(file_bytes) > INTERVIEW_RECORDING_MAX_BYTES:
        raise ValueError("Recording exceeds size limit")
    client = _get_supabase()
    client.storage.from_(INTERVIEW_RECORDINGS_BUCKET).upload(
        storage_path,
        file_bytes,
        {"content-type": "video/webm", "upsert": "true"},
    )
    logger.info("Uploaded interview recording: %s (%s bytes)", storage_path, len(file_bytes))


def create_interview_recording_signed_upload(storage_path: str) -> dict[str, str]:
    """
    Create a time-limited signed upload URL so the browser can PUT the WebM directly to Storage.
    Avoids routing large files through the API (hosting body limits / timeouts).
    """
    client = _get_supabase()
    bucket_api = client.storage.from_(INTERVIEW_RECORDINGS_BUCKET)
    if not hasattr(bucket_api, "create_signed_upload_url"):
        raise RuntimeError("Supabase client does not support create_signed_upload_url; upgrade supabase-py")
    raw = bucket_api.create_signed_upload_url(storage_path)
    if isinstance(raw, dict):
        token = raw.get("token")
        signed = raw.get("signed_url") or raw.get("signedUrl") or ""
        path = raw.get("path", storage_path)
    else:
        token = getattr(raw, "token", None)
        signed = getattr(raw, "signed_url", None) or getattr(raw, "signedUrl", None) or ""
        path = getattr(raw, "path", storage_path) or storage_path
    if not token:
        raise RuntimeError("create_signed_upload_url returned no token")
    return {"signed_url": str(signed), "token": str(token), "path": str(path)}


LOGO_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
_LOGO_EXT_TO_CT = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


def upload_company_logo(file_bytes: bytes, company_id: str, filename: str) -> str:
    """Upload a company logo to Supabase Storage; returns public URL."""
    settings = get_settings()
    if len(file_bytes) > LOGO_MAX_BYTES:
        raise ValueError("Logo exceeds size limit")
    name = (filename or "logo").replace(" ", "_")
    ext = ""
    if "." in name:
        ext = name[name.rfind(".") :].lower()
    if ext not in _LOGO_EXT_TO_CT:
        raise ValueError("Use PNG, JPG, WebP, GIF, SVG, or ICO")
    client = _get_supabase()
    bucket = settings.supabase_company_logos_bucket
    _ensure_bucket(client, bucket)
    ts = int(time.time())
    path = f"{company_id}/{ts}_{name}"
    ct = _LOGO_EXT_TO_CT[ext]
    client.storage.from_(bucket).upload(path, file_bytes, {"content-type": ct, "upsert": "true"})
    result = client.storage.from_(bucket).get_public_url(path)
    logger.info("Uploaded company logo %s: %s", company_id, path)
    return result


def delete_company_logo(url: str) -> None:
    """Remove a company logo object from Supabase when URL points at our logos bucket."""
    settings = get_settings()
    bucket = settings.supabase_company_logos_bucket
    marker = f"/object/public/{bucket}/"
    idx = url.find(marker)
    if idx < 0:
        return
    path = url[idx + len(marker) :]
    try:
        client = _get_supabase()
        client.storage.from_(bucket).remove([path])
        logger.info("Deleted company logo: %s", path)
    except Exception as e:
        logger.warning("Could not delete company logo: %s", e)
