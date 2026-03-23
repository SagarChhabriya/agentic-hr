"""
Flexible LLM service. Uses Groq by default, designed to swap providers easily.
"""

import json
import logging
import random
from typing import Optional
from app.core.config import get_settings

logger = logging.getLogger(__name__)

_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
]


def _get_client():
    from groq import Groq
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    return Groq(api_key=settings.groq_api_key)


def _chat(system: str, user: str, temperature: float = 0.7, max_tokens: int = 2048) -> str:
    client = _get_client()
    for model in _MODELS:
        try:
            resp = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning("Model %s failed: %s — trying next", model, e)
    raise RuntimeError("All LLM models failed")


def generate_job_description(
    title: str,
    location: str = "",
    job_type: str = "",
    skills: Optional[list[str]] = None,
    experience: str = "",
    extra_context: str = "",
) -> dict:
    system = (
        "You are an expert HR copywriter. Generate a professional, engaging job description. "
        "Return valid JSON with keys: description (str), requirements (str — each requirement on its own line), "
        "salary_suggestion (str — always in PKR per month, e.g. 'PKR 80,000 - PKR 150,000 / month'), "
        "skills (array of at least 10 relevant required skill strings for this role)."
    )
    prompt_parts = [f"Job Title: {title}"]
    if location:
        prompt_parts.append(f"Location: {location}")
    if job_type:
        prompt_parts.append(f"Type: {job_type}")
    if skills:
        prompt_parts.append(f"Required Skills: {', '.join(skills)}")
    if experience:
        prompt_parts.append(f"Experience: {experience}")
    if extra_context:
        prompt_parts.append(f"Additional context: {extra_context}")

    raw = _chat(system, "\n".join(prompt_parts), temperature=0.7)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
    except (json.JSONDecodeError, ValueError):
        return {"description": raw, "requirements": "", "salary_suggestion": ""}


def generate_assessment_questions_from_prompt(
    prompt: str,
    job_title: str = "",
    job_description: str = "",
    skills: Optional[list[str]] = None,
    count: int = 10,
    question_type: str = "mcq",
) -> list[dict]:
    """Generate assessment questions from a custom prompt. question_type: mcq, mixed, or custom."""
    ctx = f"Job: {job_title}\n" if job_title else ""
    if job_description:
        ctx += f"Description: {job_description[:600]}\n"
    if skills:
        ctx += f"Skills: {', '.join(skills)}\n"
    ctx += (
        f"\nUser instructions/prompt:\n{prompt}\n\n"
        f"Generate exactly {min(count, 15)} multiple-choice questions. "
        "Distribute the correct answers across all four positions (A, B, C, D) — do not put them all at index 0."
    )
    raw = _chat(_QUESTIONS_SYSTEM, ctx, temperature=0.7, max_tokens=4096)
    try:
        start = raw.find("[")
        end = raw.rfind("]") + 1
        questions = json.loads(raw[start:end])
        return [_shuffle_question_options(q) for q in questions[:count]]
    except (json.JSONDecodeError, ValueError):
        return []


def _shuffle_question_options(q: dict) -> dict:
    """Shuffle option order and update correct_index to prevent answer-position pattern leakage."""
    opts = list(q.get("options", []))
    ci = int(q.get("correct_index", 0))
    if not opts or ci >= len(opts):
        return q
    correct_answer = opts[ci]
    random.shuffle(opts)
    try:
        new_ci = opts.index(correct_answer)
    except ValueError:
        new_ci = ci
    return {**q, "options": opts, "correct_index": new_ci}


_QUESTIONS_SYSTEM = (
    "You are an expert technical recruiter creating multiple-choice assessment questions. "
    "Rules you MUST follow:\n"
    "1. Each question must directly test a specific skill or concept relevant to the job.\n"
    "2. All 4 options must be plausible — avoid obviously wrong distractors.\n"
    "3. VARY the position of the correct answer across questions: do NOT always put it first. "
    "Spread correct answers across positions A (index 0), B (index 1), C (index 2), and D (index 3).\n"
    "4. Return ONLY valid JSON — an array of objects with keys: "
    "question (str), options (array of exactly 4 strings), correct_index (int 0-3), "
    "difficulty (str: easy/medium/hard). No markdown, no extra text."
)


def generate_assessment_questions(
    job_title: str,
    job_description: str = "",
    skills: Optional[list[str]] = None,
    count: int = 10,
) -> list[dict]:
    prompt = f"Job Title: {job_title}\n"
    if job_description:
        prompt += f"Job Description: {job_description[:800]}\n"
    if skills:
        prompt += f"Required Skills to test: {', '.join(skills)}\n"
    prompt += (
        f"\nGenerate exactly {min(count, 10)} multiple-choice questions that specifically test "
        f"a candidate's knowledge of the skills and responsibilities for this '{job_title}' role. "
        "Remember: distribute correct answers across all four option positions (A, B, C, D)."
    )

    raw = _chat(_QUESTIONS_SYSTEM, prompt, temperature=0.7, max_tokens=4096)
    try:
        start = raw.find("[")
        end = raw.rfind("]") + 1
        questions = json.loads(raw[start:end])
        # Shuffle options as a safety net regardless of what the model does
        return [_shuffle_question_options(q) for q in questions[:count]]
    except (json.JSONDecodeError, ValueError):
        return []


def rank_resume(resume_text: str) -> dict:
    """Score a resume's format/structure quality between 0 and 1 with justification."""
    system = (
        "You are a professional resume reviewer. Evaluate the resume's FORMAT and STRUCTURE quality only "
        "(not content relevance). Consider: clear sections, consistent formatting, professional layout, "
        "readability, proper use of bullet points, chronological order, contact info presence, "
        "appropriate length. Return valid JSON with keys: score (float 0.0-1.0), justification (str — 1-2 sentences), "
        "strengths (array of str — max 3 short bullets), improvements (array of str — max 5 short bullets, each one concise line). "
        "Keep improvements as actionable, brief bullets (e.g. 'Add quantifiable achievements', 'Use consistent date format'). "
        "Be concise; avoid long paragraphs."
    )
    text_snippet = resume_text[:3000]
    raw = _chat(system, f"Resume text:\n{text_snippet}", temperature=0.3)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        result = json.loads(raw[start:end])
        result["score"] = max(0.0, min(1.0, float(result.get("score", 0.5))))
        return result
    except (json.JSONDecodeError, ValueError):
        return {"score": 0.5, "justification": "Could not parse AI response", "strengths": [], "improvements": []}


def rank_resume_for_job(resume_text: str, job_title: str, job_description: str = "", required_skills: Optional[list[str]] = None) -> dict:
    """Score a resume's relevance to a specific job between 0 and 1."""
    system = (
        "You are a professional recruiter. Evaluate how well this resume matches the job. "
        "Consider: relevant experience, matching skills, education alignment, overall fit. "
        "Return valid JSON with keys: relevance_score (float 0.0-1.0), justification (str), "
        "matching_skills (array of str), missing_skills (array of str)."
    )
    prompt = f"Job: {job_title}\n"
    if job_description:
        prompt += f"Description: {job_description[:500]}\n"
    if required_skills:
        prompt += f"Required skills: {', '.join(required_skills)}\n"
    prompt += f"\nResume:\n{resume_text[:3000]}"

    raw = _chat(system, prompt, temperature=0.3)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        result = json.loads(raw[start:end])
        result["relevance_score"] = max(0.0, min(1.0, float(result.get("relevance_score", 0.5))))
        return result
    except (json.JSONDecodeError, ValueError):
        return {"relevance_score": 0.5, "justification": "Could not parse AI response", "matching_skills": [], "missing_skills": []}
