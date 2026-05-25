from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from services.session_service import create_session, submit_answer, get_session
from services.pdf_generator import fill_pdf

router = APIRouter(tags=["Session"])


# ── Request models ──────────────────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    form_id: str
    user_email: str


class AnswerRequest(BaseModel):
    session_id: str
    field_name: str
    answer: str


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/session/start")
def start_session(req: StartSessionRequest):
    """
    Start an interview session for a given form.
    Returns the first question and a session_id to use in subsequent calls.

    Example input:
        { "form_id": "irs_8822", "user_email": "user@example.com" }
    """
    result = create_session(req.form_id, req.user_email)
    if not result:
        raise HTTPException(status_code=404, detail=f"Form '{req.form_id}' not found.")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/session/answer")
def answer_question(req: AnswerRequest):
    """
    Submit an answer to the current question.
    Returns the next question, or marks the session complete.

    Example input:
        { "session_id": "sess_abc123", "field_name": "full_name", "answer": "Jane Smith" }
    """
    if not req.answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty.")

    result = submit_answer(req.session_id, req.field_name, req.answer)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/session/{session_id}")
def get_session_status(session_id: str):
    """Get the current state of a session (answers so far, progress, status)."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    # Don't expose internal fields list, just the public summary
    return {
        "session_id": session["session_id"],
        "form_id": session["form_id"],
        "form_title": session["form_title"],
        "status": session["status"],
        "answered_fields": len(session["answers"]),
        "total_fields": len(session["fields"]),
        "progress": round(len(session["answers"]) / max(len(session["fields"]), 1), 2),
        "answers": session["answers"],
    }


@router.post("/fill/{session_id}")
def fill_form(session_id: str):
    """
    Fill the PDF with the session's collected answers.
    Must be called after the session is complete.
    Returns a download URL.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session["status"] != "complete":
        raise HTTPException(
            status_code=400,
            detail=f"Session is not complete yet. Progress: {len(session['answers'])}/{len(session['fields'])} fields answered."
        )

    result = fill_pdf(session_id, session["form_id"], session["answers"])
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return {
        "status": "filled",
        "session_id": session_id,
        "download_url": f"http://127.0.0.1:8000/download/{session_id}",
        "filename": result["filename"],
        "note": result.get("note"),
    }


@router.get("/download/{session_id}")
def download_filled_pdf(session_id: str):
    """
    Download the completed PDF for a session.
    In MVP this streams directly. Phase 2 will use S3 + expiring tokens.
    """
    filled_dir = Path(__file__).parent.parent / "filled_forms"
    pdf_path = filled_dir / f"{session_id}_filled.pdf"

    if not pdf_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Filled PDF not found. Call POST /fill/{session_id} first."
        )

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"completed_form_{session_id}.pdf",
    )