"""
Quick test: verify Deepgram TTS and Groq LLM work with your API keys.
Run: uv run python test_voice.py
If this succeeds, your keys are valid. If the agent still doesn't speak,
the issue may be Windows IPC between worker and inference subprocess.
"""
import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

DEEPGRAM_KEY = os.getenv("DEEPGRAM_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")


async def test_deepgram() -> bool:
    """Test Deepgram TTS with a simple request."""
    if not DEEPGRAM_KEY:
        print("  DEEPGRAM_API_KEY not set in .env")
        return False
    try:
        import aiohttp
        url = "https://api.deepgram.com/v1/speak?model=aura-2-athena-en&encoding=linear16&sample_rate=24000"
        payload = {"text": "Hello, this is a test. If you see this message, Deepgram works."}
        headers = {
            "Authorization": f"Token {DEEPGRAM_KEY}",
            "Content-Type": "application/json",
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.read()
                    print(f"  Deepgram TTS: OK ({len(data)} bytes)")
                    return True
                body = await resp.text()
                print(f"  Deepgram TTS: FAILED status={resp.status} - {body[:200]}")
                return False
    except Exception as e:
        print(f"  Deepgram TTS: FAILED - {e}")
        return False


async def test_groq() -> bool:
    """Test Groq LLM with a simple request."""
    if not GROQ_KEY:
        print("  GROQ_API_KEY not set in .env")
        return False
    try:
        import aiohttp
        url = "https://api.groq.com/openai/v1/chat/completions"
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [{"role": "user", "content": "Reply with only: Groq works"}],
            "max_tokens": 20,
        }
        headers = {
            "Authorization": f"Bearer {GROQ_KEY}",
            "Content-Type": "application/json",
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    print(f"  Groq LLM: OK - '{content.strip()}'")
                    return True
                body = await resp.text()
                print(f"  Groq LLM: FAILED status={resp.status} - {body[:200]}")
                return False
    except Exception as e:
        print(f"  Groq LLM: FAILED - {e}")
        return False


async def main() -> None:
    print("Testing API keys...\n")
    dg_ok = await test_deepgram()
    groq_ok = await test_groq()

    if dg_ok and groq_ok:
        print("\nAll API tests passed. Keys are valid.")
        print("\nIf the agent still doesn't speak, the issue is likely Windows IPC.")
        print("Run the agent via Docker (Linux) to avoid it:")
        print("  docker build -t interview-agent .")
        print("  docker run --env-file .env interview-agent")
    else:
        print("\nFix the failing API key(s) in agent/.env and try again.")


if __name__ == "__main__":
    asyncio.run(main())
