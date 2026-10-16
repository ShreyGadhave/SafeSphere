"""Generate a labelled training set of community safety reports with Groq (ML-6 data).

There is no open, labelled dataset of Indian street-safety reports, so we draft one with an LLM
and state that in the report. Each request asks for a batch of short, realistic reports for one
(category, language style) pair, with an urgency label; extra batches produce spam and abusive
posts for the moderation filter. Output is appended to JSONL, so the run is resumable and stays
inside Groq's free limits (~70 requests total; model rotation + retry-after on 429).

Usage:  python -m safesphere_ml.nlp.generate_reports
Output: ml/data/raw/nlp/generated_reports.jsonl
"""

from __future__ import annotations

import json
import time
from itertools import product
from pathlib import Path

import httpx

from safesphere_ml.common.paths import ML_ROOT, RAW_DIR

OUT = RAW_DIR / "nlp" / "generated_reports.jsonl"
MODELS = ("openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b")
CATEGORIES = {
    "harassment": "catcalling, following, stalking, groping, eve-teasing, men staring or passing comments",
    "theft": "chain snatching, pickpocketing, phone snatching, bag theft, vehicle theft",
    "assault": "physical fights, someone being beaten, attack with weapon, mob violence",
    "accident": "road accidents, bike skid, vehicle collision, pedestrian hit, autorickshaw overturned",
    "medical": "someone fainted, injured person on road, heart attack, person needs ambulance",
    "fire": "fire in a building, shop, vehicle, garbage fire, short circuit, smoke",
    "infrastructure": "broken streetlights, open manholes, potholes, waterlogging, broken footpath, dark lanes",
    "suspicious": "suspicious person loitering, unattended bag, drunk people creating nuisance, drug dealing",
    "other": "lost child, stray dog attack, noise, crowd crush, other safety issue",
}
STYLES = {
    "english": "plain Indian English",
    "hinglish": "Hinglish (Hindi and English mixed, Roman script), like WhatsApp messages",
    "roman_hindi": "Hindi written in Roman script, casual",
}
CITIES = "Mumbai, Navi Mumbai, Thane, Delhi, Pune"
PER_BATCH = 25


def api_key() -> str:
    for line in (ML_ROOT.parent / "services" / "ml-api" / ".env").read_text().splitlines():
        if line.startswith("GROQ_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("GROQ_API_KEY missing in services/ml-api/.env")


def prompt_for(kind: str, style: str) -> str:
    if kind == "spam":
        what = "SPAM posts wrongly submitted to a safety app: ads, promotions, crypto/job offers, random chatter, test messages"
        labels = '"category": "other", "urgency": "low", "moderation": "spam"'
    elif kind == "abusive":
        what = ("ABUSIVE or hateful posts wrongly submitted to a safety app: insults and rude name-calling aimed at "
                "people or groups, without describing a real incident (no slurs; mild-to-moderate rudeness)")
        labels = '"category": "other", "urgency": "low", "moderation": "abusive"'
    else:
        what = f"genuine incident reports about {kind.upper()} ({CATEGORIES[kind]})"
        labels = f'"category": "{kind}", "urgency": "low" | "medium" | "high", "moderation": "ok"'
    return (
        f"Write {PER_BATCH} different short posts (1-2 sentences, 8-40 words) for a street-safety app in India. "
        f"They are {what}. Write them in {STYLES[style]}. Mention varied real places in {CITIES} "
        "(stations, roads, markets, colonies), times of day and details; vary the tone. "
        "Urgency: high = happening now / someone in danger; medium = recent, could repeat; low = ongoing nuisance. "
        f'Return ONLY a JSON object {{"posts": [{{"text": "...", {labels}}}, ...]}}.'
    )


def request(client: httpx.Client, prompt: str) -> list[dict]:
    for _attempt in range(12):
        for model in MODELS:
            resp = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.9,
                    "max_tokens": 4000,
                },
            )
            if resp.status_code == 429:
                time.sleep(min(30.0, float(resp.headers.get("retry-after", "5"))))
                continue
            if resp.status_code >= 400:
                continue
            try:
                posts = json.loads(resp.json()["choices"][0]["message"]["content"])["posts"]
                return [p for p in posts if isinstance(p, dict) and p.get("text")]
            except (KeyError, ValueError, TypeError):
                continue
        time.sleep(10)
    return []


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    done = set()
    if OUT.exists():
        for line in OUT.read_text(encoding="utf-8").splitlines():
            r = json.loads(line)
            done.add((r["batch_kind"], r["style"], r["batch"]))
    jobs = [(k, s, b) for k, s in product([*CATEGORIES, "spam", "abusive"], STYLES) for b in range(2)]
    todo = [j for j in jobs if j not in done]
    print(f"{len(jobs) - len(todo)} batches done, {len(todo)} to go")
    headers = {"Authorization": f"Bearer {api_key()}"}
    with httpx.Client(headers=headers, timeout=120) as client, Path(OUT).open("a", encoding="utf-8") as f:
        for kind, style, batch in todo:
            posts = request(client, prompt_for(kind, style))
            for p in posts:
                f.write(json.dumps({**p, "batch_kind": kind, "style": style, "batch": batch}, ensure_ascii=False) + "\n")
            f.flush()
            print(f"{kind:15} {style:12} #{batch}: {len(posts)} posts")
            time.sleep(2.5)  # stay well under 30 requests/minute


if __name__ == "__main__":
    main()
