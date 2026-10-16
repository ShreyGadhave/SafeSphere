"""One-line alert summaries for the admin dashboard (H4).

Facts come from the database; Groq turns them into one factual line for a dispatcher. Groq is
never on the SOS path and its free quota is small, so:
  • a summary is generated once per alert and stored in alerts.ai_summary (later calls are free);
  • the Groq client caches by prompt and rotates models on 429;
  • without Groq (no key, quota exhausted, timeout) a deterministic template is used instead.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

import psycopg
from psycopg.rows import dict_row

from app.schemas.summaries import AlertSummaryResponse
from app.services.llm.groq_client import GroqClient

IST = ZoneInfo("Asia/Kolkata")
TRIGGER_TEXT = {
    "button": "SOS button",
    "motion": "fall / snatch detected by phone",
    "audio": "scream detected by phone",
    "shake": "shake SOS",
    "ride_anomaly": "cab left its expected route",
    "walk_checkin": "missed walk check-in",
    "checkin_timeout": "missed check-in",
    "low_battery": "battery critically low on a trip",
    "heartbeat_lost": "phone went silent during a trip",
}

SYSTEM = (
    "You write one-line summaries of personal-safety alerts for a police / NGO dispatcher in India. "
    "Use only the facts given. No speculation, no advice, no names. Max 24 words. Plain text."
)


def load_facts(database_url: str, alert_id: UUID) -> dict | None:
    with psycopg.connect(database_url, connect_timeout=5, row_factory=dict_row) as conn:
        alert = conn.execute(
            """
            select a.id, a.emergency_type, a.trigger_source, a.status, a.is_duress, a.priority_score,
                   a.model_scores, a.battery_pct, a.address, a.created_at, a.ai_summary,
                   t.vehicle_plate, t.vehicle_description, t.destination_name
            from public.alerts a left join public.trips t on t.id = a.trip_id
            where a.id = %s
            """,
            (alert_id,),
        ).fetchone()
        if not alert:
            return None
        events = conn.execute(
            "select kind, payload from public.alert_events where alert_id = %s order by created_at",
            (alert_id,),
        ).fetchall()
    alert["events"] = events
    return alert


def fact_lines(f: dict) -> list[str]:
    scores = f.get("model_scores") or {}
    at = f["created_at"].astimezone(IST) if isinstance(f["created_at"], datetime) else None
    lines = [
        f"type: {f['emergency_type']}",
        f"trigger: {TRIGGER_TEXT.get(f['trigger_source'], f['trigger_source'])}",
        f"priority: {f['priority_score']}/100",
        f"time: {at.strftime('%I:%M %p') if at else 'unknown'}",
    ]
    if f.get("address"):
        lines.append(f"place: {f['address']}")
    if "area_risk" in scores:
        lines.append(f"area risk: {scores['area_risk']}/100")
    for k in ("motion", "audio", "anomaly"):
        if k in scores:
            lines.append(f"{k} model confidence: {float(scores[k]):.2f}")
    if f.get("battery_pct") is not None:
        lines.append(f"battery: {f['battery_pct']}%")
    if f.get("is_duress"):
        lines.append("duress PIN used: user appeared to cancel under pressure")
    if f.get("vehicle_plate"):
        lines.append(f"cab: {f.get('vehicle_description') or 'vehicle'} {f['vehicle_plate']}")
    kinds = [e["kind"] for e in f["events"]]
    if "guardian_accepted" in kinds:
        lines.append("a guardian is responding")
    if "sms_sent" in kinds:
        lines.append("contacts alerted by SMS")
    return lines


def template(f: dict) -> str:
    """Deterministic summary used whenever Groq is unavailable."""
    parts = [
        f"{f['emergency_type'].capitalize()} alert",
        TRIGGER_TEXT.get(f["trigger_source"], f["trigger_source"]),
    ]
    scores = f.get("model_scores") or {}
    if "area_risk" in scores and float(scores["area_risk"]) >= 75:
        parts.append("high-risk area")
    if f.get("battery_pct") is not None and f["battery_pct"] < 15:
        parts.append(f"battery {f['battery_pct']}%")
    if f.get("is_duress"):
        parts.append("DURESS PIN used")
    if f.get("vehicle_plate"):
        parts.append(f"cab {f['vehicle_plate']}")
    at = f["created_at"].astimezone(IST).strftime("%I:%M %p") if isinstance(f["created_at"], datetime) else ""
    return (", ".join(parts) + (f", {at}" if at else "") + ".").replace(" ,", ",")


async def summarize(database_url: str, llm: GroqClient, alert_id: UUID) -> AlertSummaryResponse | None:
    facts = load_facts(database_url, alert_id)
    if facts is None:
        return None
    if facts.get("ai_summary"):
        return AlertSummaryResponse(
            alert_id=alert_id, text=facts["ai_summary"], model=None, cached=True, fallback_used=False
        )

    result = await llm.complete(
        [{"role": "system", "content": SYSTEM}, {"role": "user", "content": "\n".join(fact_lines(facts))}],
        max_tokens=300,
        fallback=lambda: template(facts),
    )
    text = " ".join(result.text.split())[:240] or template(facts)
    with psycopg.connect(database_url, connect_timeout=5) as conn:
        conn.execute("update public.alerts set ai_summary = %s where id = %s", (text, alert_id))
    return AlertSummaryResponse(
        alert_id=alert_id,
        text=text,
        model=result.model,
        cached=result.cached,
        fallback_used=result.fallback_used,
    )
