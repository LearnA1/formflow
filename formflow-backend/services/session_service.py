import uuid
from datetime import datetime, timedelta
from services.form_catalog_service import get_form_by_id

# In-memory store for MVP — replace with PostgreSQL later
# Structure: { session_id: { ...session data } }
sessions: dict[str, dict] = {}


# --- Human-readable question mapping ---
# Maps field_name patterns to natural questions.
# AI will enhance this in a later phase.
QUESTION_MAP = {
    "full_name":              "What is your full legal name?",
    "first_name":             "What is your first name?",
    "last_name":              "What is your last name?",
    "ssn":                    "What is your Social Security Number? (format: XXX-XX-XXXX)",
    "date_of_birth":          "What is your date of birth? (MM/DD/YYYY)",
    "tenant_dob":             "What is your date of birth? (MM/DD/YYYY)",
    "email":                  "What is your email address?",
    "tenant_email":           "What is your email address?",
    "phone":                  "What is your phone number?",
    "tenant_phone":           "What is your phone number?",
    "tenant_full_name":       "What is your full legal name?",
    "old_address":            "What is your current/previous street address?",
    "new_address":            "What will be your new street address?",
    "current_address":        "What is your current street address?",
    "old_city":               "What city are you moving from?",
    "new_city":               "What city are you moving to?",
    "old_state":              "What state are you moving from? (e.g. WA)",
    "new_state":              "What state are you moving to? (e.g. CA)",
    "old_zip":                "What is the ZIP code of your current address?",
    "new_zip":                "What will be your new ZIP code?",
    "license_number":         "What is your driver's license number?",
    "desired_move_in":        "What is your desired move-in date? (MM/DD/YYYY)",
    "monthly_income":         "What is your gross monthly income? (e.g. $5,000)",
    "employer_name":          "What is the name of your current employer?",
    "emergency_contact_name": "What is your emergency contact's full name?",
    "emergency_contact_phone":"What is your emergency contact's phone number?",
}

def _field_to_question(field_name: str) -> str:
    """Convert a field_name to a human question. Falls back to a clean auto-generated question."""
    if field_name in QUESTION_MAP:
        return QUESTION_MAP[field_name]
    # Auto-generate: replace underscores, title-case
    readable = field_name.replace("_", " ").strip()
    return f"What is your {readable}?"


def create_session(form_id: str, user_email: str) -> dict:
    form = get_form_by_id(form_id)
    if not form:
        return None

    session_id = f"sess_{uuid.uuid4().hex[:10]}"
    fields = form.get("fields", [])

    sessions[session_id] = {
        "session_id": session_id,
        "form_id": form_id,
        "form_title": form["title"],
        "user_email": user_email,
        "fields": fields,
        "answers": {},
        "current_index": 0,
        "status": "active",
        "created_at": datetime.utcnow().isoformat(),
    }

    first_field = fields[0] if fields else None
    if not first_field:
        return {"error": "This form has no fillable fields."}

    return {
        "session_id": session_id,
        "form_id": form_id,
        "form_title": form["title"],
        "total_fields": len(fields),
        "first_question": _field_to_question(first_field["field_name"]),
        "field_name": first_field["field_name"],
        "field_type": first_field["type"],
        "required": first_field.get("required", True),
        "progress": 0.0,
    }


def submit_answer(session_id: str, field_name: str, answer: str) -> dict:
    session = sessions.get(session_id)
    if not session:
        return {"error": "Session not found."}
    if session["status"] != "active":
        return {"error": f"Session is {session['status']}."}

    # Save the answer
    session["answers"][field_name] = answer
    session["current_index"] += 1

    fields = session["fields"]
    current_index = session["current_index"]
    total = len(fields)
    progress = round(current_index / total, 2)

    if current_index >= total:
        session["status"] = "complete"
        return {
            "complete": True,
            "progress": 1.0,
            "session_id": session_id,
            "message": "All questions answered. Ready to fill your PDF.",
        }

    next_field = fields[current_index]
    return {
        "complete": False,
        "progress": progress,
        "next_question": _field_to_question(next_field["field_name"]),
        "next_field": next_field["field_name"],
        "field_type": next_field["type"],
        "required": next_field.get("required", True),
        "answered_so_far": current_index,
        "total_fields": total,
    }


def get_session(session_id: str) -> dict | None:
    return sessions.get(session_id)