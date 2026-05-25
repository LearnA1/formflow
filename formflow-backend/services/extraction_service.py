import pypdf
from pathlib import Path


def extract_fields_from_path(pdf_path: str) -> list[dict]:
    """Extract fillable form fields from a PDF file on disk."""
    reader = pypdf.PdfReader(pdf_path)
    return _parse_fields(reader)


def extract_fields_from_bytes(pdf_bytes: bytes) -> list[dict]:
    """Extract fillable form fields from raw PDF bytes (uploaded file)."""
    import io
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    return _parse_fields(reader)


def _parse_fields(reader: pypdf.PdfReader) -> list[dict]:
    raw_fields = reader.get_fields()

    if not raw_fields:
        return []

    result = []
    for name, field in raw_fields.items():
        field_type = _map_type(field.get("/FT", "/Tx"))
        flags = int(field.get("/Ff", 0))
        required = bool(flags & 2)

        result.append({
            "field_name": name,
            "type": field_type,
            "required": required,
        })

    return result


def _map_type(pdf_type) -> str:
    mapping = {
        "/Tx": "text",
        "/Btn": "boolean",
        "/Ch": "select",
        "/Sig": "signature",
    }
    if hasattr(pdf_type, "name"):
        return mapping.get(pdf_type.name, "text")
    return mapping.get(str(pdf_type), "text")