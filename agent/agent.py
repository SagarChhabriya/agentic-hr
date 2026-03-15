"""
LiveKit voice agent for AI interviews.
Uses Groq for LLM and Deepgram for STT/TTS. Runs as a separate process;
uses the same LIVEKIT_* credentials as the backend so it joins rooms
created by the API (e.g. interview-{application_id}-{timestamp}).
"""

import logging
import os
import sys
from pathlib import Path

# Configure logging to stdout immediately — before any other imports — so Azure
# log stream captures output even if the process crashes during startup.
logging.basicConfig(
    level=logging.DEBUG,
    stream=sys.stdout,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    force=True,
)
_log = logging.getLogger("agent")
_log.info("agent.py loaded — argv: %s", sys.argv)

from dotenv import load_dotenv

# Load .env from agent directory so LIVEKIT_URL, etc. are set for both main and worker
load_dotenv(Path(__file__).resolve().parent / ".env")

# Validate required env vars only when starting the agent (skip for download-files during Docker build)
_REQUIRED = ("LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "GROQ_API_KEY", "DEEPGRAM_API_KEY")
if "download-files" not in sys.argv:
    missing = [k for k in _REQUIRED if not os.getenv(k)]
    if missing:
        _log.error("Missing required environment variables: %s", missing)
        raise RuntimeError(f"Missing env vars: {missing}. Check .env or Azure Application settings.")
    _log.info(
        "All required env vars present. LIVEKIT_URL=%s",
        os.getenv("LIVEKIT_URL", ""),
    )

from livekit import agents
from livekit.agents import Agent, AgentSession, AgentServer
from livekit.plugins import deepgram, groq, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

# Default model names; override via env if needed
# Use 8b-instant for faster responses; 70b-versatile for higher quality (can be slower)
GROQ_MODEL = "llama-3.1-8b-instant"
DEEPGRAM_STT_MODEL = "nova-3"
DEEPGRAM_STT_LANGUAGE = "en"
# Athena: professional, calm; Asteria: energetic. Both are valid aura-2 voices.
DEEPGRAM_TTS_MODEL = "aura-2-athena-en"


class InterviewAgent(Agent):
    """AI interviewer for HR: professional, structured, job-focused."""

    def __init__(self) -> None:
        super().__init__(
            instructions="""You are a professional AI interviewer for a hiring platform.
You conduct structured interviews: introduce yourself briefly, ask clear questions about experience and skills, and listen to the candidate's answers.
Keep responses concise and natural for voice. Do not use markdown, bullet points, or emojis.
Be polite, professional, and encouraging. Ask one question at a time and allow the candidate to finish before responding.
If the candidate seems stuck, you may rephrase or offer a brief hint. Wrap up by thanking them and summarizing next steps when the interview is ending.""",
        )


server = AgentServer()


# No agent_name = automatic dispatch: joins every new room in the project.
@server.rtc_session()
async def interview_agent(ctx: agents.JobContext) -> None:
    """Entrypoint: join the room and run the voice pipeline (Deepgram STT -> Groq LLM -> Deepgram TTS)."""
    import logging
    log = logging.getLogger("livekit.agents")
    log.info("interview_agent: starting session for room %s", ctx.room.name)

    session = AgentSession(
        stt=deepgram.STT(
            model=DEEPGRAM_STT_MODEL,
            language=DEEPGRAM_STT_LANGUAGE,
        ),
        llm=groq.LLM(model=GROQ_MODEL),
        # Deepgram plugin TTS (required for self-hosted/Azure; LiveKit Inference is Cloud-only)
        tts=deepgram.TTS(model=DEEPGRAM_TTS_MODEL),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    await session.start(
        room=ctx.room,
        agent=InterviewAgent(),
        # No custom room_options - use defaults; add noise_cancellation back if needed
    )

    log.info("interview_agent: session started, speaking greeting")
    try:
        # Use say() for reliable initial TTS (fixed phrase; then LLM handles conversation)
        await session.say(
            "Hello! I'm your AI interviewer. Please tell me your name, and we'll begin with the first question.",
            allow_interruptions=True,
        )
        log.info("interview_agent: greeting spoken")
    except Exception as e:
        log.error("interview_agent: say failed: %s", e, exc_info=True)
        raise


if __name__ == "__main__":
    agents.cli.run_app(server)
