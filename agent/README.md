# Interview Voice Agent (LiveKit + Groq + Deepgram)

This service is the **AI interviewer** that joins LiveKit rooms when a candidate enters an interview. It uses:

- **Groq** for the LLM (same as the main backend).
- **Deepgram** for speech-to-text (STT) and text-to-speech (TTS).

The backend creates rooms named `interview-{application_id}-{timestamp}` and issues tokens for candidates. This agent connects to the **same LiveKit project** and is dispatched into those rooms so the candidate can talk to the AI.

## Requirements

- Python ≥ 3.10
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (recommended) or pip

## Setup

1. **Create virtualenv and install dependencies**

   ```bash
   cd agent
   uv sync
   ```

2. **Copy env and set secrets**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:

   - **LIVEKIT_URL**, **LIVEKIT_API_KEY**, **LIVEKIT_API_SECRET** — same values as the backend (LiveKit Cloud or self-hosted).
   - **GROQ_API_KEY** — same as backend; from [console.groq.com/keys](https://console.groq.com/keys).
   - **DEEPGRAM_API_KEY** — from [console.deepgram.com](https://console.deepgram.com/).

3. **Download model files** (Silero VAD, turn detector)

   ```bash
   uv run agent.py download-files
   ```

## Run

- **Dev (connects to LiveKit; one worker)**  
  ```bash
  uv run agent.py dev
  ```

- **Production**  
  ```bash
  uv run agent.py start
  ```

- **Console (terminal-only, no LiveKit)**  
  ```bash
  uv run agent.py console
  ```

## Room dispatch

The agent uses **explicit dispatch**: `agent_name="interview-agent"` with `RoomAgentDispatch` in the candidate's token. When a candidate joins an interview room, the token requests this agent, and the LiveKit server dispatches the job to this worker.

## What’s required

| Item | Purpose |
|------|--------|
| **LiveKit** (URL + API key + secret) | Same as backend; agent and candidates join the same project. |
| **Groq API key** | LLM for the interviewer (same key as backend). |
| **Deepgram API key** | STT and TTS for the voice pipeline. |
| **Running agent process** | Must be running (e.g. `uv run agent.py dev`) so it can join when a candidate enters an interview room. |

**Deployment (Azure cloud):** See [docs/agent-azure-setup.md](../docs/agent-azure-setup.md) for a step-by-step guide. Push to `main` triggers GitHub Actions → build → deploy to Azure Web App.
---

## What else is required?

| Requirement | Details |
|-------------|--------|
| **LiveKit** | Same URL + API key + secret as the backend. Create a project at [cloud.livekit.io](https://cloud.livekit.io) or self-host. |
| **Groq** | `GROQ_API_KEY` (same as backend). Get it at [console.groq.com/keys](https://console.groq.com/keys). |
| **Deepgram** | `DEEPGRAM_API_KEY` for STT and TTS. Get it at [console.deepgram.com](https://console.deepgram.com/). |
| **Agent process** | Run `uv run agent.py dev` (or `start` in production) so the agent can join interview rooms. |
| **Model files** | Run `uv run agent.py download-files` once to fetch Silero VAD and turn-detector models. |

No extra services are needed: the backend already has LiveKit and Groq; you only add **Deepgram** for the voice agent and run the **agent process** alongside the backend.

## Troubleshooting: agent in room but not speaking

If the agent joins the room (visible as "agent-xxx") but does not respond when the candidate speaks:

1. **LiveKit Inference vs self-hosted** — On Azure (self-hosted), you must use the **Deepgram plugin** for TTS, not LiveKit Inference (`tts="deepgram/aura-2:athena"`). See [docs/agent-no-speech-solution.md](../docs/agent-no-speech-solution.md) for the full root cause and fix.
2. **Test API keys** — Run `uv run python test_voice.py` to verify Deepgram and Groq work. Fix any failures in `agent/.env`.
3. **Windows IPC issues** — The terminal may show `DuplexClosed` or `ConnectionResetError` between the worker and inference subprocess. This is a known issue on Windows. **Solution: run the agent via Docker** (Linux container avoids it):
   ```bash
   docker build -t interview-agent .
   docker run --env-file .env interview-agent
   ```
4. **Check env vars on Azure** — If deployed to Azure, add `DEEPGRAM_API_KEY` and `GROQ_API_KEY` in Web App → Configuration → Application settings.
5. **Enable debug logging** — Set `LIVEKIT_AGENTS_LOG_LEVEL=DEBUG` before starting.
6. **Mic permissions** — Ensure the candidate has allowed microphone access.
