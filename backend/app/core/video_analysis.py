"""
Azure Computer Vision + Face API behaviour analysis for interview recordings.

Flow:
  1. Download video via signed Supabase URL.
  2. Extract FRAME_SAMPLE_COUNT uniformly-spaced frames (OpenCV).
  3. For each frame call:
     - Azure Face API  → face count, head-pose (yaw/pitch), occlusion, blur
     - Azure Computer Vision → object/scene context (used for future enrichment)
  4. Aggregate into a structured BehaviourSummary.
  5. Persist to InterviewAnalysis via a fresh DB session.

All errors are logged and swallowed — this runs as a fire-and-forget background
task and MUST NOT affect the main request pipeline.
"""

import asyncio
import logging
import os
import tempfile

import httpx

_log = logging.getLogger(__name__)

FRAME_SAMPLE_COUNT = 8          # frames to sample per video
MAX_VIDEO_BYTES = 200 * 1024 * 1024  # 200 MB guard


# ---------------------------------------------------------------------------
# Frame extraction (OpenCV)
# ---------------------------------------------------------------------------

def _extract_frames(video_bytes: bytes, n: int = FRAME_SAMPLE_COUNT) -> list[bytes]:
    """Return up to *n* JPEG-encoded frames sampled uniformly from *video_bytes*.

    Requires ``opencv-python-headless``.  Returns [] on failure so the
    caller can decide what to do.
    """
    try:
        import cv2  # type: ignore
    except ImportError:
        _log.warning("opencv-python-headless not installed; skipping frame extraction")
        return []

    tmp_path = ""
    frames: list[bytes] = []
    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            _log.warning("OpenCV could not open video (codec not supported?)")
            return []

        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 300
        step = max(1, total // n)

        for i in range(n):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i * step)
            ret, frame = cap.read()
            if not ret:
                break
            ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ok:
                frames.append(buf.tobytes())

        cap.release()
    except Exception:
        _log.exception("Frame extraction raised unexpectedly")
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    return frames


# ---------------------------------------------------------------------------
# Azure API helpers (pure httpx — no Azure SDK dependency)
# ---------------------------------------------------------------------------

async def _azure_face_detect(frame_bytes: bytes, endpoint: str, key: str) -> list[dict]:
    """POST a JPEG frame to Azure Face API Detect; returns list of face dicts."""
    url = endpoint.rstrip("/") + "/face/v1.0/detect"
    params = {
        "returnFaceAttributes": "headPose,blur,occlusion,exposure",
        "detectionModel": "detection_01",
        "recognitionModel": "recognition_04",
        "returnFaceId": "false",
    }
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/octet-stream",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, content=frame_bytes, params=params, headers=headers)
            if r.status_code == 200:
                return r.json()
            _log.warning("Azure Face API %d: %s", r.status_code, r.text[:200])
    except Exception:
        _log.exception("Azure Face API call failed")
    return []


async def _azure_cv_analyze(frame_bytes: bytes, endpoint: str, key: str) -> dict:
    """POST a JPEG frame to Azure Computer Vision Analyze; returns result dict."""
    url = endpoint.rstrip("/") + "/vision/v3.2/analyze"
    params = {"visualFeatures": "Objects,Description,Categories"}
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/octet-stream",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, content=frame_bytes, params=params, headers=headers)
            if r.status_code == 200:
                return r.json()
            _log.warning("Azure CV API %d: %s", r.status_code, r.text[:200])
    except Exception:
        _log.exception("Azure CV API call failed")
    return {}


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------

def _aggregate(frame_results: list[dict]) -> dict:
    """Compute summary metrics from per-frame Face API results.

    Returns a dict that maps directly onto InterviewAnalysis columns:
      cheating_detected, cheating_details, confidence_score (attention 0-100),
      behavior_notes, plus extra keys stored in raw_analysis.
    """
    total = len(frame_results)
    if total == 0:
        return {
            "cheating_detected": False,
            "cheating_details": None,
            "confidence_score": None,
            "behavior_notes": "No frames could be analyzed.",
            "attention_score": None,
            "face_detected_ratio": None,
            "multiple_faces_detected": False,
            "avg_yaw": None,
            "avg_pitch": None,
            "looking_away_ratio": None,
            "frames_analyzed": 0,
        }

    face_frames = 0
    multi_face_frames = 0
    yaws: list[float] = []
    pitches: list[float] = []
    looking_away_frames = 0

    for fr in frame_results:
        faces: list[dict] = fr.get("faces", [])
        n = len(faces)
        if n >= 1:
            face_frames += 1
        if n >= 2:
            multi_face_frames += 1

        for face in faces:
            hp = face.get("faceAttributes", {}).get("headPose", {})
            yaw = float(hp.get("yaw", 0))
            pitch = float(hp.get("pitch", 0))
            yaws.append(yaw)
            pitches.append(pitch)
            if abs(yaw) > 20 or abs(pitch) > 20:
                looking_away_frames += 1
                break  # one mark per frame

    face_ratio = face_frames / total
    look_away_ratio = looking_away_frames / total
    avg_yaw = round(sum(yaws) / len(yaws), 1) if yaws else None
    avg_pitch = round(sum(pitches) / len(pitches), 1) if pitches else None

    # Attention score: face presence weighted down by gaze deviation
    raw_attn = face_ratio * (1.0 - 0.5 * look_away_ratio)
    attention_score = min(100, round(raw_attn * 100))

    # Build human-readable notes
    notes: list[str] = []
    if face_ratio < 0.5:
        notes.append(
            f"Candidate was not visible in {round((1 - face_ratio) * 100)}% of sampled frames."
        )
    if look_away_ratio > 0.3:
        notes.append(
            f"Candidate appeared to look away from the camera in "
            f"{round(look_away_ratio * 100)}% of frames."
        )
    if multi_face_frames:
        notes.append(
            f"Multiple faces detected in {multi_face_frames} of {total} frame(s) — "
            "possible third-party assistance."
        )
    if avg_yaw is not None and abs(avg_yaw) < 15 and avg_pitch is not None and abs(avg_pitch) < 15:
        notes.append("Gaze was generally directed at the camera (within normal thresholds).")
    if not notes:
        notes.append("No significant behavioural concerns detected.")

    cheating = multi_face_frames > 0
    cheating_details = (
        f"Multiple faces detected in {multi_face_frames}/{total} sampled frame(s)."
        if cheating
        else None
    )

    return {
        "cheating_detected": cheating,
        "cheating_details": cheating_details,
        "confidence_score": attention_score,    # stored in InterviewAnalysis.confidence_score
        "behavior_notes": " ".join(notes),
        "attention_score": attention_score,
        "face_detected_ratio": round(face_ratio, 3),
        "multiple_faces_detected": cheating,
        "avg_yaw": avg_yaw,
        "avg_pitch": avg_pitch,
        "looking_away_ratio": round(look_away_ratio, 3),
        "frames_analyzed": total,
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def run_video_analysis(
    *,
    session_id: str,
    video_storage_path: str,
    supabase_url: str,
    supabase_service_key: str,
    azure_cv_endpoint: str,
    azure_cv_key: str,
    azure_face_endpoint: str,
    azure_face_key: str,
) -> dict | None:
    """Download → extract frames → call Azure → aggregate.

    Returns the summary dict on success, or *None* if a non-recoverable
    error occurs (already logged).
    """
    _log.info(
        "Video analysis START session=%s path=%s", session_id, video_storage_path
    )

    # --- 1. Signed URL from Supabase ---
    try:
        from supabase import create_client  # type: ignore

        sb = create_client(supabase_url, supabase_service_key)
        raw_signed = await asyncio.to_thread(
            sb.storage.from_("interview-recordings").create_signed_url,
            video_storage_path,
            300,
        )
        signed_url: str | None = None
        if isinstance(raw_signed, str) and raw_signed.startswith("http"):
            signed_url = raw_signed
        elif isinstance(raw_signed, dict):
            data = raw_signed.get("data") or {}
            if isinstance(data, dict):
                signed_url = (
                    data.get("signedURL") or data.get("signedUrl") or data.get("signed_url")
                )
            signed_url = signed_url or (
                raw_signed.get("signedURL")
                or raw_signed.get("signedUrl")
                or raw_signed.get("signed_url")
            )
        if not signed_url:
            _log.error("Supabase returned no signed URL for %s: %r", video_storage_path, raw_signed)
            return None
    except Exception:
        _log.exception("Could not obtain signed URL for session=%s", session_id)
        return None

    # --- 2. Download video ---
    try:
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            resp = await client.get(signed_url)
            if resp.status_code != 200:
                _log.error(
                    "Video download HTTP %d for session=%s", resp.status_code, session_id
                )
                return None
            video_bytes = resp.content
    except Exception:
        _log.exception("Video download failed for session=%s", session_id)
        return None

    if len(video_bytes) > MAX_VIDEO_BYTES:
        _log.warning(
            "Video %d bytes exceeds limit for session=%s; skipping", len(video_bytes), session_id
        )
        return None

    _log.info(
        "Downloaded %d bytes for session=%s; extracting frames", len(video_bytes), session_id
    )

    # --- 3. Extract frames (CPU-bound → thread) ---
    frames: list[bytes] = await asyncio.to_thread(
        _extract_frames, video_bytes, FRAME_SAMPLE_COUNT
    )
    if not frames:
        _log.warning("No frames extracted for session=%s — storing partial result", session_id)
        return {
            "cheating_detected": False,
            "cheating_details": None,
            "confidence_score": None,
            "behavior_notes": "Frame extraction failed; the video codec may not be supported by the analysis engine.",
            "frames_analyzed": 0,
        }

    _log.info(
        "Extracted %d frames for session=%s; calling Azure APIs", len(frames), session_id
    )

    # --- 4. Azure API calls (sequential to stay within rate limits) ---
    frame_results: list[dict] = []
    for i, frame_bytes in enumerate(frames):
        faces = await _azure_face_detect(frame_bytes, azure_face_endpoint, azure_face_key)
        # CV call is optional enrichment — don't block analysis if it fails
        cv_data = await _azure_cv_analyze(frame_bytes, azure_cv_endpoint, azure_cv_key)
        frame_results.append({"faces": faces, "cv_description": cv_data.get("description", {})})
        _log.debug("Frame %d/%d: %d face(s) detected", i + 1, len(frames), len(faces))

    # --- 5. Aggregate ---
    summary = _aggregate(frame_results)
    _log.info(
        "Video analysis DONE session=%s attention=%s cheating=%s",
        session_id,
        summary.get("attention_score"),
        summary.get("cheating_detected"),
    )
    return summary


# ---------------------------------------------------------------------------
# Background task wrapper (creates its own DB session)
# ---------------------------------------------------------------------------

async def trigger_video_analysis_task(session_id: str, video_storage_path: str) -> None:
    """Fire-and-forget coroutine; wraps run_video_analysis + DB persist.

    Call via ``asyncio.create_task(trigger_video_analysis_task(...))``.
    Never raises — all errors are logged.
    """
    try:
        from app.core.config import get_settings
        settings = get_settings()

        if not settings.azure_cv_endpoint or not settings.azure_cv_key:
            _log.info(
                "Azure CV not configured (AZURE_CV_ENDPOINT / AZURE_CV_KEY missing) — "
                "video analysis skipped for session=%s",
                session_id,
            )
            return

        face_endpoint = settings.azure_face_endpoint or settings.azure_cv_endpoint
        face_key = settings.azure_face_key or settings.azure_cv_key

        result = await run_video_analysis(
            session_id=session_id,
            video_storage_path=video_storage_path,
            supabase_url=settings.supabase_url,
            supabase_service_key=settings.supabase_service_key,
            azure_cv_endpoint=settings.azure_cv_endpoint,
            azure_cv_key=settings.azure_cv_key,
            azure_face_endpoint=face_endpoint,
            azure_face_key=face_key,
        )
        if result is None:
            return

        await _persist_analysis(session_id, result)

    except Exception:
        _log.exception("trigger_video_analysis_task failed for session=%s", session_id)


async def _persist_analysis(session_id: str, result: dict) -> None:
    """Upsert InterviewAnalysis row using a fresh database session."""
    from app.core.database import AsyncSessionLocal
    from app.models.interview import InterviewAnalysis
    from sqlalchemy import select

    # Strip large raw fields before persisting; keep only computed metrics
    raw_to_store = {
        k: v
        for k, v in result.items()
        if k
        not in (
            "cheating_detected",
            "cheating_details",
            "confidence_score",
            "behavior_notes",
        )
    }

    async with AsyncSessionLocal() as db:
        try:
            existing_result = await db.execute(
                select(InterviewAnalysis).where(InterviewAnalysis.session_id == session_id)
            )
            analysis = existing_result.scalar_one_or_none()

            if analysis:
                analysis.cheating_detected = result.get("cheating_detected", False)
                analysis.cheating_details = result.get("cheating_details")
                analysis.confidence_score = result.get("confidence_score")
                analysis.behavior_notes = result.get("behavior_notes")
                analysis.raw_analysis = raw_to_store
            else:
                analysis = InterviewAnalysis(
                    session_id=session_id,
                    cheating_detected=result.get("cheating_detected", False),
                    cheating_details=result.get("cheating_details"),
                    confidence_score=result.get("confidence_score"),
                    behavior_notes=result.get("behavior_notes"),
                    raw_analysis=raw_to_store,
                )
                db.add(analysis)

            await db.commit()
            _log.info("InterviewAnalysis persisted for session=%s", session_id)
        except Exception:
            await db.rollback()
            _log.exception("Failed to persist InterviewAnalysis for session=%s", session_id)
