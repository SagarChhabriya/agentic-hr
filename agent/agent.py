"""
LiveKit voice agent for AI interviews.
Uses Groq for LLM and Deepgram for STT/TTS. Runs as a separate process;
uses the same LIVEKIT_* credentials as the backend so it joins rooms
created by the API (e.g. interview-{application_id}-{timestamp}).
"""

from pathlib import Path

from dotenv import load_dotenv

# Load .env from agent directory so LIVEKIT_URL, etc. are set for both main and worker
load_dotenv(Path(__file__).resolve().parent / ".env")

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


@server.rtc_session(agent_name="interview-agent")
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
        tts=deepgram.TTS(model=DEEPGRAM_TTS_MODEL),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    await session.start(
        room=ctx.room,
        agent=InterviewAgent(),
        # No custom room_options - use defaults; add noise_cancellation back if needed
    )

    log.info("interview_agent: session started, generating greeting")
    try:
        await session.generate_reply(
            instructions="Greet the candidate and introduce yourself as the AI interviewer. Ask them to tell you their name and then proceed with the first interview question."
        )
        log.info("interview_agent: greeting sent")
    except Exception as e:
        log.error("interview_agent: generate_reply failed: %s", e, exc_info=True)
        raise


if __name__ == "__main__":
    agents.cli.run_app(server)
