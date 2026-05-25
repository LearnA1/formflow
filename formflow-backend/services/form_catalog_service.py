import json
import os
from pathlib import Path

# Path to the catalog file, relative to this service
CATALOG_PATH = Path(__file__).parent.parent / "data" / "form_catalog.json"


def load_catalog() -> list[dict]:
    with open(CATALOG_PATH, "r") as f:
        return json.load(f)


def recommend_forms(message: str) -> dict:
    """
    Given a user message, return matching forms from the catalog.
    Uses keyword matching for MVP — no AI needed for this step.
    """
    catalog = load_catalog()
    message_lower = message.lower()

    matched = []
    for form in catalog:
        score = 0
        for keyword in form["keywords"]:
            if keyword.lower() in message_lower:
                score += 1
        if score > 0:
            matched.append((score, form))

    # Sort by score descending
    matched.sort(key=lambda x: x[0], reverse=True)

    if not matched:
        return {
            "life_event": "unknown",
            "recommended_forms": [],
            "message": "I couldn't identify a specific life event from your message. Try describing what you're doing, like 'I am moving' or 'I need to change my address'."
        }

    # Detect the primary life event from the top match
    top_form = matched[0][1]
    life_event = top_form["life_events"][0] if top_form["life_events"] else "general"

    recommended = []
    for _, form in matched:
        recommended.append({
            "id": form["id"],
            "title": form["title"],
            "description": form["description"],
            "official_source": form["official_source"],
            "reason": _generate_reason(form, message_lower),
            "field_count": len(form.get("fields", [])),
        })

    return {
        "life_event": life_event,
        "recommended_forms": recommended,
    }


def get_form_by_id(form_id: str) -> dict | None:
    catalog = load_catalog()
    for form in catalog:
        if form["id"] == form_id:
            return form
    return None


def _generate_reason(form: dict, message: str) -> str:
    """Simple rule-based reason string — no AI needed."""
    reasons = {
        "irs_8822": "Required to notify the IRS of your new mailing address so you continue receiving tax documents.",
        "rental_application": "You'll need this to apply for a new apartment or rental property at your destination.",
        "dmv_change_of_address": "Most states require you to update your driver's license address within 30 days of moving.",
    }
    return reasons.get(form["id"], f"Relevant for your situation: {form['description']}")