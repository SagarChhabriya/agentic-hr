# Interview voice agent (Groq + Deepgram). Use for Azure Container Apps, App Service, or any Docker host.
FROM python:3.11-slim-bookworm

WORKDIR /app

# Install uv for fast, reproducible installs
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
ENV UV_SYSTEM_PYTHON=1
# Disable Python output buffering so all logs appear immediately in Azure log stream
ENV PYTHONUNBUFFERED=1

# Dependencies and agent code
COPY pyproject.toml agent.py ./
RUN uv sync --no-dev

# Pre-download Silero VAD model at build time (silero only; turn-detector removed)
RUN uv run python -u -c "from livekit.plugins import silero; silero.VAD.load(); print('VAD model downloaded', flush=True)"

# Production: connect to LiveKit and join rooms (-u = force unbuffered stdout/stderr)
CMD ["uv", "run", "python", "-u", "agent.py", "start", "--log-level=DEBUG"]
