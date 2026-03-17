"""
LiveKit voice agent for AI interviews.
Uses Groq for LLM and Deepgram for STT/TTS. Runs as a separate process;
uses the same LIVEKIT_* credentials as the backend so it joins rooms
created by the API (e.g. interview-{application_id}-{timestamp}).
"""

import logging
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

# print() + flush before any import so Azure log stream sees output even on import crash
print("[agent] startup — argv:", sys.argv, flush=True)


# ---------------------------------------------------------------------------
# Minimal HTTP health server — required by Azure Web App for Containers.
# Listens on $PORT (default 8080) so Azure doesn't mark the instance unhealthy.
# ---------------------------------------------------------------------------
class _HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/health"):
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"ok")
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args):
        pass  # suppress per-request access logs


def _start_health_server():
    port = int(os.environ.get("PORT", 8080))
    try:
        server = HTTPServer(("0.0.0.0", port), _HealthHandler)
        print(f"[agent] health server listening on port {port}", flush=True)
        server.serve_forever()
    except Exception as exc:
        print(f"[agent] health server error: {exc}", flush=True)


# Start in a background daemon thread — dies automatically when the main process exits
threading.Thread(target=_start_health_server, daemon=True, name="health-server").start()

logging.basicConfig(
    level=logging.DEBUG,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.StreamHandler(sys.stderr),
    ],
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    force=True,
)
_log = logging.getLogger("agent")
_log.info("logging initialised")

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

_REQUIRED = ("LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "GROQ_API_KEY", "DEEPGRAM_API_KEY")
if "download-files" not in sys.argv:
    missing = [k for k in _REQUIRED if not os.getenv(k)]
    if missing:
        msg = f"Missing env vars: {missing}. Check Azure Application settings."
        print(f"[agent] FATAL — {msg}", flush=True)
        _log.error("FATAL — %s", msg)
        raise RuntimeError(msg)
    print(f"[agent] env OK — LIVEKIT_URL={os.getenv('LIVEKIT_URL', '')}", flush=True)
    _log.info("env OK — LIVEKIT_URL=%s", os.getenv("LIVEKIT_URL", ""))

print("[agent] importing livekit...", flush=True)
from livekit import agents
from livekit.agents import Agent, AgentSession, WorkerOptions
from livekit.plugins import deepgram, groq, silero

print("[agent] livekit imported", flush=True)
_log.info("livekit imported successfully")

GROQ_MODEL = "llama-3.1-8b-instant"
DEEPGRAM_STT_MODEL = "nova-3"
DEEPGRAM_STT_LANGUAGE = "en"
DEEPGRAM_TTS_MODEL = "aura-2-athena-en"


class InterviewAgent(Agent):
    """AI interviewer: greets immediately on enter, then conducts structured interview."""

    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are a professional AI interviewer for a hiring platform. "
                "Conduct structured interviews: ask clear questions about experience and skills, "
                "listen carefully, and respond naturally. Keep answers concise — this is voice, "
                "not text. No markdown, bullet points, or emojis. Ask one question at a time. "
                "Wrap up by thanking the candidate and explaining next steps."
            ),
        )

    async def on_enter(self) -> None:
        """Fires the moment the agent is ready — greet the candidate immediately."""
        print("[agent] on_enter: greeting now", flush=True)
        _log.info("on_enter: speaking greeting")
        await self.session.say(
            "Hello! I'm your AI interviewer. Please tell me your name, and we can begin.",
            allow_interruptions=True,
        )
        print("[agent] on_enter: greeting complete", flush=True)
        _log.info("on_enter: greeting complete")


async def entrypoint(ctx: agents.JobContext) -> None:
    print(f"[agent] entrypoint: room={ctx.room.name}", flush=True)
    _log.info("entrypoint: room=%s", ctx.room.name)

    await ctx.connect()
    print(f"[agent] connected to room={ctx.room.name}", flush=True)
    _log.info("connected to room=%s", ctx.room.name)

    # VAD-only pipeline — no MultilingualModel turn detector (requires downloaded model file).
    # silero.VAD provides reliable turn detection without any extra download dependency.
    print("[agent] loading VAD...", flush=True)
    vad = silero.VAD.load()
    print("[agent] VAD loaded", flush=True)

    session = AgentSession(
        stt=deepgram.STT(model=DEEPGRAM_STT_MODEL, language=DEEPGRAM_STT_LANGUAGE),
        llm=groq.LLM(model=GROQ_MODEL),
        tts=deepgram.TTS(model=DEEPGRAM_TTS_MODEL),
        vad=vad,
        # turn_detection removed — MultilingualModel requires a downloaded model file
        # that may not be present; VAD alone is sufficient for reliable turn detection.
    )

    # Log pipeline events so we can trace exactly where the audio pipeline stalls
    @session.on("user_speech_started")
    def _on_speech_started(_evt=None):
        print("[agent] >>> user speech started", flush=True)
        _log.info("pipeline: user speech started")

    @session.on("user_speech_committed")
    def _on_speech_committed(evt=None):
        text = getattr(evt, "user_transcript", "") if evt else ""
        print(f"[agent] >>> transcript committed: {text!r}", flush=True)
        _log.info("pipeline: transcript committed: %r", text)

    @session.on("agent_speech_started")
    def _on_agent_speech_started(_evt=None):
        print("[agent] <<< agent speech started (TTS playing)", flush=True)
        _log.info("pipeline: agent speech started")

    @session.on("agent_speech_committed")
    def _on_agent_speech_committed(_evt=None):
        print("[agent] <<< agent speech committed", flush=True)
        _log.info("pipeline: agent speech committed")

    print("[agent] starting session...", flush=True)
    _log.info("calling session.start()")
    await session.start(room=ctx.room, agent=InterviewAgent())
    print("[agent] session.start() returned — on_enter() will fire next", flush=True)
    _log.info("session.start() complete")


if __name__ == "__main__":
    print("[agent] run_app starting", flush=True)
    agents.cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
