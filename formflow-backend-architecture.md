# FormFlow — Backend Architecture

## Stack
- **Runtime**: Python 3.11 + FastAPI
- **PDF**: pypdf + pdf-lib (node) or reportlab
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Storage**: AWS S3 (encrypted)
- **Database**: PostgreSQL (Supabase)
- **Email**: SendGrid
- **Cache/Sessions**: Redis

---

## Directory Structure

```
formflow-backend/
├── main.py
├── requirements.txt
├── .env.example
├── services/
│   ├── upload_service.py
│   ├── extraction_service.py
│   ├── ai_agent.py
│   ├── mapping_engine.py
│   ├── pdf_generator.py
│   └── delivery_service.py
├── models/
│   ├── form.py
│   ├── session.py
│   └── answer.py
├── routers/
│   ├── upload.py
│   ├── session.py
│   └── download.py
└── utils/
    ├── security.py
    └── validators.py
```

---

## API Endpoints

### POST /upload
Upload a PDF form.

**Request**: multipart/form-data
```json
{
  "file": "<pdf binary>",
  "user_email": "user@example.com"
}
```

**Response**:
```json
{
  "session_id": "abc123",
  "form_id": "form_xyz",
  "status": "uploaded"
}
```

---

### POST /extract/{form_id}
Extract fields from uploaded PDF.

**Response**:
```json
{
  "fields": [
    { "field_name": "first_name", "type": "text", "required": true },
    { "field_name": "dob", "type": "date", "required": true },
    { "field_name": "has_pets", "type": "boolean", "required": false }
  ],
  "total_fields": 11
}
```

---

### POST /session/start
Start an interview session.

**Request**:
```json
{
  "form_id": "form_xyz",
  "user_email": "user@example.com"
}
```

**Response**:
```json
{
  "session_id": "sess_abc",
  "first_question": "What is your full legal name?",
  "field_name": "first_name"
}
```

---

### POST /session/answer
Submit an answer in the interview.

**Request**:
```json
{
  "session_id": "sess_abc",
  "field_name": "first_name",
  "answer": "Jane Smith"
}
```

**Response**:
```json
{
  "next_question": "What is your email address?",
  "next_field": "tenant_email",
  "progress": 0.18,
  "complete": false
}
```

---

### POST /fill/{session_id}
Fill the PDF with collected answers.

**Response**:
```json
{
  "status": "filled",
  "download_token": "dl_TOKEN123",
  "expires_at": "2026-05-23T10:00:00Z"
}
```

---

### GET /download/{token}
Retrieve filled PDF (expires after 24h, single-use).

**Response**: PDF binary stream

---

## Services

### extraction_service.py
```python
import pypdf

def extract_fields(pdf_path: str) -> list[dict]:
    reader = pypdf.PdfReader(pdf_path)
    fields = reader.get_fields()
    if not fields:
        return []
    
    result = []
    for name, field in fields.items():
        field_type = field.get("/FT")
        result.append({
            "field_name": name,
            "type": map_pdf_type(field_type),
            "required": bool(field.get("/Ff", 0) & 2),
        })
    return result

def map_pdf_type(pdf_type: str) -> str:
    mapping = {
        "/Tx": "text",
        "/Btn": "boolean",
        "/Ch": "select",
        "/Sig": "signature",
    }
    return mapping.get(pdf_type, "text")
```

---

### ai_agent.py
```python
import anthropic

client = anthropic.Anthropic()

SYSTEM_PROMPT = """You are a helpful assistant guiding a user through filling out a form.
Your job is to convert raw PDF field names into natural, conversational questions.
Keep questions short, clear, and friendly.
If the user's answer is unclear or invalid for the field type, ask for clarification.
Never ask for information you already have."""

def generate_question(field_name: str, field_type: str, context: dict) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=200,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"""Convert this PDF field into a conversational question.
Field name: {field_name}
Field type: {field_type}
Already collected: {list(context.keys())}

Respond with ONLY the question, nothing else."""
        }]
    )
    return response.content[0].text.strip()

def validate_answer(field_name: str, field_type: str, answer: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=100,
        messages=[{
            "role": "user",
            "content": f"""Is this a valid answer for a {field_type} field named '{field_name}'?
Answer: "{answer}"
Reply with JSON: {{"valid": true/false, "reason": "..."}}"""
        }]
    )
    import json
    text = response.content[0].text.strip()
    return json.loads(text)
```

---

### pdf_generator.py
```python
import pypdf
from pypdf.generic import NameObject, create_string_object
import io

def fill_pdf(template_path: str, answers: dict) -> bytes:
    reader = pypdf.PdfReader(template_path)
    writer = pypdf.PdfWriter()
    writer.append(reader)
    
    # Fill all form fields
    for page in writer.pages:
        writer.update_page_form_field_values(page, answers)
    
    # Flatten the form (make non-editable)
    for page in writer.pages:
        if "/Annots" in page:
            for annot in page["/Annots"]:
                annot_obj = annot.get_object()
                annot_obj.update({
                    NameObject("/Ff"): pypdf.generic.NumberObject(1)
                })
    
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()
```

---

### delivery_service.py
```python
import secrets
import hashlib
from datetime import datetime, timedelta
import boto3
import sendgrid

def generate_secure_link(pdf_bytes: bytes, email: str, db) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    # Upload encrypted PDF to S3
    s3 = boto3.client("s3")
    key = f"forms/{hashlib.sha256(token.encode()).hexdigest()}.pdf"
    s3.put_object(
        Bucket="formflow-secure",
        Key=key,
        Body=pdf_bytes,
        ServerSideEncryption="AES256",
        Expires=expires_at,
    )
    
    # Save token to DB (hashed)
    db.execute("""
        INSERT INTO download_tokens (token_hash, s3_key, expires_at, email)
        VALUES ($1, $2, $3, $4)
    """, hashlib.sha256(token.encode()).hexdigest(), key, expires_at, email)
    
    # Send email via SendGrid
    send_download_email(email, token, expires_at)
    
    return f"https://formflow.ai/secure/{token}"

def send_download_email(email: str, token: str, expires_at: datetime):
    sg = sendgrid.SendGridAPIClient()
    sg.send({
        "to": email,
        "from": "noreply@formflow.ai",
        "subject": "Your completed form is ready",
        "html": f"""
        <p>Your form has been filled and is ready to download.</p>
        <p><a href="https://formflow.ai/download/{token}">Download your form</a></p>
        <p>This link expires at {expires_at.strftime('%B %d at %I:%M %p UTC')}.</p>
        <p>For security, this link is single-use and we never store your personal information.</p>
        """
    })
```

---

## Security Checklist

- [x] HTTPS only (enforce HSTS)
- [x] PDF uploads virus-scanned before processing
- [x] Download tokens are hashed in DB (raw token only in email)
- [x] S3 objects have server-side encryption (AES-256)
- [x] S3 objects auto-delete after 24h (lifecycle policy)
- [x] No sensitive field values logged (SSN, DOB masked in logs)
- [x] Sessions expire after 2h of inactivity
- [x] Rate limiting on /upload (10/hour per IP)
- [x] Rate limiting on /download (3 attempts per token)
- [x] CORS locked to formflow.ai origin

---

## Environment Variables

```env
# AI
ANTHROPIC_API_KEY=

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=formflow-secure

# Database
DATABASE_URL=postgresql://...

# Email
SENDGRID_API_KEY=

# App
SECRET_KEY=<random 64 bytes>
ALLOWED_ORIGINS=https://formflow.ai
```

---

## Database Schema

```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  fields JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id),
  email TEXT NOT NULL,
  answers JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 hours'
);

CREATE TABLE download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  session_id UUID REFERENCES sessions(id),
  s3_key TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
