"""
LiveKit voice agent for AI interviews.
Uses Groq for LLM and Deepgram for STT/TTS. Runs as a separate process;
uses the same LIVEKIT_* credentials as the backend so it joins rooms
created by the API (e.g. interview-{application_id}-{timestamp}).
"""

from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import Agent, AgentSession, AgentServer, room_io
from livekit.plugins import deepgram, groq, noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv()

# Default model names; override via env if needed
GROQ_MODEL = "llama-3.3-70b-versatile"
DEEPGRAM_STT_MODEL = "nova-3"
DEEPGRAM_STT_LANGUAGE = "en"
DEEPGRAM_TTS_MODEL = "aura-2-asteria-en"


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
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )

    await session.generate_reply(
        instructions="Greet the candidate and introduce yourself as the AI interviewer. Ask them to tell you their name and then proceed with the first interview question."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
