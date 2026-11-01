"""
Shared interviewer voice and style validation.

Every prompt that produces an interview question (the standalone question
generator AND the combined evaluate-and-propose prompt in answer_processor)
imports INTERVIEWER_PERSONA from here, so both paths sound like the same
interviewer and cannot drift apart.

validate_question_style() is a cheap, deterministic post-check. It does not
judge whether a question is *good*; it catches the failure modes that make
an AI interviewer feel robotic (stock phrases, praise openers, bundled
questions, rambling, leaked scores) so the caller can retry or fall back.
"""

from __future__ import annotations

import re

INTERVIEWER_PERSONA = """
INTERVIEWER VOICE:
You are a senior engineer running a live technical interview. You listen
closely, speak plainly, and sound like a person, not a form. The "question"
field is the exact words you would say out loud.

LISTEN FIRST:
- When following up, anchor on something specific the candidate actually said
  (a technology, a design choice, a number, a claim) and build on it.
- Check the recent turns for contradictions. If the candidate now says
  something that conflicts with an earlier answer, surface it politely and ask
  them to reconcile the two.

PICK THE RIGHT MOVE FOR THE ANSWER:
- Strong answer: acknowledge the core choice in a few words, then push on edge
  cases, failure modes, scale, or trade-offs.
  e.g. "That covers the happy path. What happens if two requests claim the same ID at once?"
- Vague or hand-wavy answer: ask for the concrete mechanism, not a restatement.
  e.g. "You said you'd add a cache. How would entries get invalidated when the underlying rows change?"
- Wrong or flawed answer: do not correct them. Ask a targeted question that lets
  them notice the problem themselves.
  e.g. "If the token lives in local storage, what stops an XSS payload from reading it?"
- Short or minimal answer: probe the mechanism or a real example from their work.
- A named tool or technology: ask why that one over the alternatives, and what it costs them.
- Changing topic: use a short bridge, then ask.
  e.g. "Okay, that makes sense. Shifting to your database work: how do you find and fix a slow query?"

NEVER SAY (these make you sound like a bot):
- "Could you elaborate?", "Can you clarify or expand on that?", "Tell me more about your experience with X."
- "Great answer!", "Awesome!", "That's interesting!", "Let's dive deeper!", "Excellent point!"
- Anything that reveals scores, ratings, rubrics, expected concepts, or the action label.

FORMAT:
- One to three sentences. Exactly one question. Never bundle two questions.
- Plain spoken English. No markdown, no lists, no quotation marks around the whole thing.
""".strip()


# Phrases that signal a generic, robotic interviewer. Matched case-insensitively.
BANNED_PHRASES: tuple[str, ...] = (
    "could you elaborate",
    "can you elaborate",
    "could you clarify or expand",
    "clarify or expand",
    "can you tell me more about your experience",
    "tell me more about your experience",
    "let's dive deeper",
    "lets dive deeper",
    "great answer",
    "good answer",
    "excellent answer",
    "that's interesting",
    "that is interesting",
    "thanks for sharing",
    "thank you for sharing",
)

_PRAISE_OPENER = re.compile(
    r"^\s*(great|excellent|awesome|perfect|amazing|fantastic|wonderful|brilliant)\b[!,. ]",
    re.IGNORECASE,
)

# Hints that internal evaluation data leaked into the spoken question.
_LEAK_PATTERNS = (
    re.compile(r"\b\d+(\.\d+)?\s*/\s*10\b"),
    re.compile(r"\byour score\b", re.IGNORECASE),
    re.compile(r"\bexpected[_ ]concepts?\b", re.IGNORECASE),
    re.compile(r"\badaptive[_ ]action\b", re.IGNORECASE),
    re.compile(r"\bmissing[_ ]concepts?\b", re.IGNORECASE),
)

MIN_QUESTION_CHARS = 20
MAX_QUESTION_SENTENCES = 3
MAX_QUESTION_WORDS = 75


def _count_sentences(text: str) -> int:
    parts = [p for p in re.split(r"(?<=[.!?])\s+", text.strip()) if p.strip()]
    return len(parts)


def validate_question_style(question: str) -> list[str]:
    """
    Return a list of human-readable style problems. An empty list means the
    question passes. The messages are written so they can be fed straight back
    to the model as retry instructions.
    """
    text = (question or "").strip()
    if len(text) < MIN_QUESTION_CHARS:
        return ["the question is empty or too short to be a real interview question"]

    issues: list[str] = []
    lowered = text.lower()

    for phrase in BANNED_PHRASES:
        if phrase in lowered:
            issues.append(f'it uses the stock phrase "{phrase}"; ask something specific instead')
            break

    if _PRAISE_OPENER.match(text):
        issues.append("it opens with praise; acknowledge the point in a few neutral words instead")

    if text.count("?") > 1:
        issues.append("it asks more than one question; ask exactly one")

    if _count_sentences(text) > MAX_QUESTION_SENTENCES:
        issues.append(f"it is longer than {MAX_QUESTION_SENTENCES} sentences; tighten it")
    elif len(text.split()) > MAX_QUESTION_WORDS:
        issues.append(f"it is longer than {MAX_QUESTION_WORDS} words; tighten it")

    for pattern in _LEAK_PATTERNS:
        if pattern.search(text):
            issues.append("it leaks internal evaluation details; never mention scores or rubrics")
            break

    if "```" in text or re.search(r"^\s*([-*]|\d+\.)\s+", text, re.MULTILINE):
        issues.append("it contains markdown or list formatting; use plain spoken sentences")

    return issues


def style_retry_instruction(issues: list[str]) -> str:
    """Instruction appended to the prompt when a retry is needed."""
    bullet_list = "\n".join(f"- {issue}" for issue in issues)
    return (
        "\n\nSTYLE FIX REQUIRED: your previous question was rejected because:\n"
        f"{bullet_list}\n"
        "Rewrite it as one natural spoken question that fixes these problems, "
        "and keep the same JSON schema."
    )
