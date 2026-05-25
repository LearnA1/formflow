from fastapi import APIRouter, UploadFile, File, HTTPException
from services.extraction_service import extract_fields_from_bytes

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a fillable PDF. Returns extracted field names and types.

    This is Milestone 1 + 2 from the roadmap:
    - Accepts the PDF
    - Extracts all form fields
    - Returns them as JSON so you can see what's in the form
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    fields = extract_fields_from_bytes(contents)

    return {
        "status": "uploaded",
        "filename": file.filename,
        "total_fields": len(fields),
        "fields": fields,
        "note": "No fillable fields found — this may be a scanned or non-fillable PDF." if not fields else None,
    }